import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { InviteCodeGeneratorPort } from '../../domain/session/invite-code-generator.port';
import { UserRole } from '../../domain/user/user-profile';

export interface CreateSessionInput {
  gameSystemId: string;
  name: string;
  createdByUserId: string;
  createdByUserRole: UserRole;
  /** Per-session choice, immutable after creation - see `GameSession.charactersVisibleToOthers`. */
  charactersVisibleToOthers: boolean;
}

export interface CreateSessionResult {
  session: GameSession;
  /**
   * The creator does not get a finished `Character`/`SessionPlayer`
   * synchronously anymore - character creation is now a guided AI
   * conversation (see `PRD.md` addendum). They only become an active
   * `SessionPlayer` once `FinalizeCharacterCreationUseCase` runs against
   * this id.
   */
  characterCreationSessionId: string;
}

const MAX_INVITE_CODE_ATTEMPTS = 10;

/**
 * Creates a game session and starts the creator's guided character-creation
 * conversation (a `CharacterCreationSession`, seeded with a static opening
 * message - no LLM call here, see `CharacterCreationSession.create()` doc
 * comment). The creator only becomes an active `SessionPlayer` once they
 * finalize that conversation (`FinalizeCharacterCreationUseCase`) - per
 * `PRD.md`, "Solo = cas particulier du multi" still holds once they do.
 */
@Injectable()
export class CreateSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
    private readonly inviteCodeGenerator: InviteCodeGeneratorPort,
  ) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionResult> {
    const gameSystem = await this.gameSystemRepository.findById(
      input.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }
    if (input.createdByUserRole === 'child' && !gameSystem.adaptedForChildren) {
      throw new ForbiddenException(
        "Ce JdR n'est pas adapté aux comptes enfant : impossible de créer une partie avec.",
      );
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const session = GameSession.create({
      gameSystemId: gameSystem.id,
      name: input.name,
      inviteCode,
      createdByUserId: input.createdByUserId,
      charactersVisibleToOthers: input.charactersVisibleToOthers,
    });
    await this.gameSessionRepository.save(session);

    const characterCreationSession = CharacterCreationSession.create({
      gameSessionId: session.id,
      gameSystemId: gameSystem.id,
      userId: input.createdByUserId,
    });
    await this.characterCreationSessionRepository.save(
      characterCreationSession,
    );

    return {
      session,
      characterCreationSessionId: characterCreationSession.id,
    };
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
      const code = this.inviteCodeGenerator.generate();
      const existing = await this.gameSessionRepository.findByInviteCode(code);
      if (!existing) {
        return code;
      }
    }
    throw new Error('Unable to generate a unique invite code');
  }
}
