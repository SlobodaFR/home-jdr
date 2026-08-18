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
import { UserRole } from '../../domain/user/user-profile';

export interface JoinSessionInput {
  inviteCode: string;
  userId: string;
  userRole: UserRole;
}

export interface JoinSessionResult {
  session: GameSession;
  characterCreationSessionId: string;
}

/**
 * Joins an existing `GameSession` by invite code and starts (or resumes) the
 * joining player's guided character-creation conversation. Rejects a
 * `child` account from a session whose `GameSystem` is not flagged
 * `adaptedForChildren` (see `PRD.md` and the acceptance criteria in
 * `tasks/03-session-engine.md`) - preserved exactly as-is.
 *
 * Idempotence: re-joining with the same invite code returns the SAME
 * `CharacterCreationSession` id, whether the caller is already fully seated
 * (finalized, `completed` creation session) or still mid-creation
 * (`in_progress`) - never starts a duplicate. A single
 * `CharacterCreationSessionRepository.findByGameSessionAndUser()` lookup
 * covers both cases, since a finalized player's creation session is kept
 * around (marked `completed`), not deleted.
 */
@Injectable()
export class JoinSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly characterCreationSessionRepository: CharacterCreationSessionRepository,
  ) {}

  async execute(input: JoinSessionInput): Promise<JoinSessionResult> {
    const session = await this.gameSessionRepository.findByInviteCode(
      input.inviteCode.trim().toUpperCase(),
    );
    if (!session) {
      throw new NotFoundException(
        "Aucune partie ne correspond à ce code d'invitation.",
      );
    }

    const gameSystem = await this.gameSystemRepository.findById(
      session.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }
    if (input.userRole === 'child' && !gameSystem.adaptedForChildren) {
      throw new ForbiddenException(
        "Ce JdR n'est pas adapté aux comptes enfant : impossible de rejoindre cette partie.",
      );
    }

    const existingCreationSession =
      await this.characterCreationSessionRepository.findByGameSessionAndUser(
        session.id,
        input.userId,
      );
    if (existingCreationSession) {
      return {
        session,
        characterCreationSessionId: existingCreationSession.id,
      };
    }

    const characterCreationSession = CharacterCreationSession.create({
      gameSessionId: session.id,
      gameSystemId: gameSystem.id,
      userId: input.userId,
    });
    await this.characterCreationSessionRepository.save(
      characterCreationSession,
    );

    return {
      session,
      characterCreationSessionId: characterCreationSession.id,
    };
  }
}
