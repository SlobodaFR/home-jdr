import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { LlmGameMasterPort } from '../../domain/session/llm-game-master.port';
import { QuotaExceededError } from '../../domain/usage-quota/quota-exceeded.error';
import { UsageQuotaPort } from '../../domain/usage-quota/usage-quota.port';
import { toCharacterDomainSchema } from '../session/character-schema-adapter';

export interface SendCharacterCreationMessageInput {
  characterCreationSessionId: string;
  userId: string;
  message: string;
}

/**
 * Advances the guided character-creation conversation by one exchange: the
 * player's message goes in, the LLM's next question/proposal comes back and
 * gets merged into the draft sheet.
 *
 * Follows `ResolveSceneUseCase`'s exact quota guard-rail pattern (see
 * `CLAUDE.md` - "Jamais d'appel LLM sans vérification de quota au
 * préalable" applies to every LLM call, not just scene resolution):
 * `UsageQuotaPort.checkQuotaAvailable()` is checked BEFORE any LLM work, and
 * `recordUsage()` is called only after a successful billed call.
 */
@Injectable()
export class SendCharacterCreationMessageUseCase {
  constructor(
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly llmGameMasterPort: LlmGameMasterPort,
    private readonly usageQuotaPort: UsageQuotaPort,
    private readonly config: ConfigService,
  ) {}

  async execute(
    input: SendCharacterCreationMessageInput,
  ): Promise<CharacterCreationSession> {
    const creationSession =
      await this.characterCreationSessionRepository.findById(
        input.characterCreationSessionId,
      );
    if (!creationSession) {
      throw new NotFoundException('Character creation session not found');
    }
    if (creationSession.userId !== input.userId) {
      throw new ForbiddenException(
        'This character creation session does not belong to you',
      );
    }
    if (creationSession.status !== 'in_progress') {
      throw new ConflictException(
        'This character creation session is already completed',
      );
    }

    // Guard-rail (see CLAUDE.md): checked before any work that leads to a
    // billed LLM call, so quota exhaustion never consumes one - mirrors
    // ResolveSceneUseCase.resolve()'s guard exactly.
    if (!(await this.usageQuotaPort.checkQuotaAvailable())) {
      throw new QuotaExceededError();
    }

    const gameSystem = await this.gameSystemRepository.findById(
      creationSession.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }

    const output = await this.llmGameMasterPort.assistCharacterCreation({
      rulesText: gameSystem.rulesText,
      characterSheetSchema: toCharacterDomainSchema(
        gameSystem.characterSheetSchema,
      ),
      messages: [
        ...creationSession.messages,
        { role: 'user', content: input.message },
      ],
      draftCharacter: creationSession.draftCharacter,
    });

    const llmProvider = this.config.get<'claude' | 'openai'>(
      'LLM_PROVIDER',
      'claude',
    );
    // Audit-only, post-hoc: the billed call already happened above - this
    // never gates it (same pattern as ResolveSceneUseCase).
    await this.usageQuotaPort.recordUsage({
      sessionId: creationSession.gameSessionId,
      // Character creation is not tied to a turn - there is none yet.
      turnNumber: 0,
      provider: llmProvider,
      callType: 'character_creation',
    });

    const updated = creationSession.appendExchange({
      userMessage: input.message,
      assistantMessage: output.assistantMessage,
      draftUpdates: output.draftUpdates,
    });
    await this.characterCreationSessionRepository.save(updated);
    return updated;
  }
}
