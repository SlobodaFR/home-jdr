import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharacterRepository } from '../../domain/character/character.repository';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { DeleteSessionCascade } from './delete-session-cascade';

export interface LeaveSessionInput {
  sessionId: string;
  userId: string;
}

export interface LeaveSessionResult {
  /**
   * True when the requester was the last active player: the whole session
   * (and everything scoped to it) was cascade-deleted as a side effect -
   * lets the caller know whether to just refresh or navigate away entirely.
   */
  sessionDeleted: boolean;
}

/**
 * A player leaves a group session. Allowed at any time regardless of the
 * session's turn status - leaving is not a turn action, so `resolving`
 * doesn't block it (product decision, see the task brief). Removes the
 * departing player's `SessionPlayer` row and their `Character` - per
 * `PRD.md`'s "1 personnage = 1 partie", a character has no future use once
 * its session-membership ends.
 *
 * If this was the last active `SessionPlayer` of the session, the whole
 * session cascades away exactly like `DeleteSoloSessionUseCase` (shared
 * `DeleteSessionCascade` - one cascade implementation, no duplication).
 */
@Injectable()
export class LeaveSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly cascade: DeleteSessionCascade,
  ) {}

  async execute(input: LeaveSessionInput): Promise<LeaveSessionResult> {
    const session = await this.gameSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player = await this.sessionPlayerRepository.findBySessionAndUser(
      input.sessionId,
      input.userId,
    );
    if (!player) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette partie : impossible de la quitter.',
      );
    }

    await this.sessionPlayerRepository.deleteBySessionAndUser(
      input.sessionId,
      input.userId,
    );
    await this.characterRepository.deleteById(player.characterId);

    const remainingPlayers = await this.sessionPlayerRepository.findBySessionId(
      input.sessionId,
    );
    if (remainingPlayers.length === 0) {
      await this.cascade.execute(input.sessionId);
      return { sessionDeleted: true };
    }

    return { sessionDeleted: false };
  }
}
