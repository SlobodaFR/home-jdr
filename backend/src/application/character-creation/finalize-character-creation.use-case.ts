import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CharacterCreationDraft } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { SessionPlayer } from '../../domain/session/session-player';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { toCharacterDomainSchema } from '../session/character-schema-adapter';

export interface FinalizeCharacterCreationInput {
  characterCreationSessionId: string;
  userId: string;
}

export interface FinalizeCharacterCreationResult {
  character: Character;
  sessionPlayer: SessionPlayer;
}

/** Folds the draft's overrides into the `GameSystem`'s schema defaults - only fields the draft actually set win, everything else keeps the schema default. */
function applyDraftOverrides(
  baseSchema: CharacterSheetSchema,
  draft: CharacterCreationDraft,
): CharacterSheetSchema {
  return {
    baseAttributes: {
      hitPoints: {
        max: draft.hitPointsMax ?? baseSchema.baseAttributes.hitPoints.max,
      },
      inventory: draft.inventory ?? baseSchema.baseAttributes.inventory,
    },
    customAttributes: baseSchema.customAttributes.map((attribute) => ({
      ...attribute,
      default: draft.customAttributes?.[attribute.key] ?? attribute.default,
    })),
  };
}

/**
 * Finalizes a `CharacterCreationSession`: builds the real `Character` from
 * the `GameSystem`'s schema defaults with the chat-collected draft applied
 * on top, seats the player (`SessionPlayer` - THIS is the moment they become
 * an active participant, see `PRD.md` addendum), and marks the creation
 * session `completed`.
 *
 * `LlmGameMasterPort.assistCharacterCreation`'s `readyToFinalize` flag is
 * purely advisory (UI hint) - this use-case independently verifies
 * `draftCharacter.name` regardless of what the LLM thought, never trusting
 * it as authoritative for this state transition.
 */
@Injectable()
export class FinalizeCharacterCreationUseCase {
  constructor(
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
  ) {}

  async execute(
    input: FinalizeCharacterCreationInput,
  ): Promise<FinalizeCharacterCreationResult> {
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

    const draft = creationSession.draftCharacter;
    if (typeof draft.name !== 'string' || !draft.name.trim()) {
      throw new BadRequestException(
        "La fiche n'est pas prête : le personnage doit avoir un nom avant de pouvoir être validé.",
      );
    }

    const gameSystem = await this.gameSystemRepository.findById(
      creationSession.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }

    const now = new Date();
    const effectiveSchema = applyDraftOverrides(
      toCharacterDomainSchema(gameSystem.characterSheetSchema),
      draft,
    );
    const character = Character.fromSchema({
      id: randomUUID(),
      gameSystemId: gameSystem.id,
      sessionId: creationSession.gameSessionId,
      ownerUserId: input.userId,
      name: draft.name,
      schema: effectiveSchema,
      now,
    });
    await this.characterRepository.save(character);

    const sessionPlayer = SessionPlayer.create({
      sessionId: creationSession.gameSessionId,
      userId: input.userId,
      characterId: character.id,
    });
    await this.sessionPlayerRepository.save(sessionPlayer);

    const completed = creationSession.complete(now);
    await this.characterCreationSessionRepository.save(completed);

    return { character, sessionPlayer };
  }
}
