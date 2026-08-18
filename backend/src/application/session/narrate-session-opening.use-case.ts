import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CharacterRepository } from '../../domain/character/character.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { LlmGameMasterPort } from '../../domain/session/llm-game-master.port';
import { UsageQuotaPort } from '../../domain/usage-quota/usage-quota.port';
import { toCharacterDomainSchema } from './character-schema-adapter';

export interface NarrateSessionOpeningInput {
  sessionId: string;
}

/**
 * Genuinely proactive opening narration for a session, fired once every
 * player has finalized their character (see `FinalizeCharacterCreationUseCase`
 * - it triggers this use-case as a best-effort side effect once
 * `CharacterCreationSessionRepository.findInProgressByGameSessionId()`
 * returns empty AND `GameSession.openingNarrationText` is still `null`).
 *
 * Best-effort, non-blocking by design (see `CLAUDE.md` - point 3 of the
 * opening-narration task brief): this use-case itself never throws for
 * "expected" no-op conditions (missing session/game system, quota
 * exhausted) - it simply returns without narrating. Any unexpected error
 * from `LlmGameMasterPort.narrateOpening()` DOES propagate (same as
 * `ResolveSceneUseCase`) - it is the CALLER's (`FinalizeCharacterCreationUseCase`)
 * responsibility to catch and swallow it, so the character/session-player
 * creation that already succeeded is never rolled back or reported as
 * failed because of a narration problem.
 *
 * This is NOT a `TurnResolution` (no dice, no deltas, no `turnNumber >= 1`
 * invariant to satisfy - see `TurnResolution`) and never touches
 * `SubmitTurnActionUseCase`'s turn-counting logic.
 */
@Injectable()
export class NarrateSessionOpeningUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly llmGameMasterPort: LlmGameMasterPort,
    private readonly usageQuotaPort: UsageQuotaPort,
    private readonly config: ConfigService,
  ) {}

  async execute(
    input: NarrateSessionOpeningInput,
  ): Promise<GameSession | null> {
    const session = await this.gameSessionRepository.findById(input.sessionId);
    if (!session) {
      // Should never actually happen given how this is triggered (right
      // after that same session was just used to finalize a character) -
      // but this is a best-effort side effect, not a critical path: no
      // scary error, just no-op.
      return null;
    }

    // Guard-rail (see CLAUDE.md - "Jamais d'appel LLM sans vérification de
    // quota au préalable"): checked before any billed LLM call, exactly
    // like ResolveSceneUseCase.resolve(). Silent no-op on exhaustion - the
    // caller treats this whole use-case as best-effort.
    if (!(await this.usageQuotaPort.checkQuotaAvailable())) {
      return session;
    }

    const gameSystem = await this.gameSystemRepository.findById(
      session.gameSystemId,
    );
    if (!gameSystem) {
      return session;
    }

    const characters = await this.characterRepository.findBySessionId(
      session.id,
    );

    const output = await this.llmGameMasterPort.narrateOpening({
      rulesText: gameSystem.rulesText,
      characterSheetSchema: toCharacterDomainSchema(
        gameSystem.characterSheetSchema,
      ),
      gameSystemName: gameSystem.name,
      gameSystemDescription: gameSystem.description,
      characters: characters.map((character) => ({
        characterId: character.id,
        name: character.name,
        hitPointsCurrent: character.hitPointsCurrent,
        hitPointsMax: character.hitPointsMax,
        inventory: character.inventory,
        customAttributes: character.customAttributes,
      })),
    });

    const llmProvider = this.config.get<'claude' | 'openai'>(
      'LLM_PROVIDER',
      'claude',
    );
    // Audit-only, post-hoc: the billed call already happened above - this
    // never gates it (same pattern as ResolveSceneUseCase).
    await this.usageQuotaPort.recordUsage({
      sessionId: session.id,
      // Not tied to a turn - the opening narration happens before any turn
      // has been played, same convention as the "character_creation" call
      // type in SendCharacterCreationMessageUseCase.
      turnNumber: 0,
      provider: llmProvider,
      callType: 'opening_narration',
    });

    const updated = session.withOpeningNarration(output.narrationText);
    await this.gameSessionRepository.save(updated);
    return updated;
  }
}
