import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { DeleteSessionCascade } from './delete-session-cascade';

export interface DeleteSoloSessionInput {
  sessionId: string;
  userId: string;
}

/**
 * Permanently deletes a session, but only when there is no other active
 * player to consult:
 *
 * - Exactly one active `SessionPlayer`, and the requester IS that player
 *   (the classic solo-session case), OR
 * - Zero active `SessionPlayer`s (nobody has finished character creation
 *   yet - including the creator, who only becomes a `SessionPlayer` once
 *   `FinalizeCharacterCreationUseCase` runs), and the requester is the
 *   session's creator. This covers a creator abandoning the guided
 *   character-creation chat before finishing it: the session would
 *   otherwise be stuck forever, undeletable and unleavable, since
 *   `LeaveSessionUseCase` requires an active `SessionPlayer` too.
 *
 * A session with 2+ active players must never be deleted this way - each
 * player leaves individually via `LeaveSessionUseCase`, which cascades the
 * same way once the last one is gone (see product decision in the task
 * brief).
 */
@Injectable()
export class DeleteSoloSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly cascade: DeleteSessionCascade,
  ) {}

  async execute(input: DeleteSoloSessionInput): Promise<void> {
    const session = await this.gameSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const players = await this.sessionPlayerRepository.findBySessionId(
      input.sessionId,
    );
    const isSoloOwnedByRequester =
      players.length === 1 && players[0].userId === input.userId;
    const isUnclaimedByCreator =
      players.length === 0 && session.createdByUserId === input.userId;
    if (!isSoloOwnedByRequester && !isUnclaimedByCreator) {
      throw new ForbiddenException(
        'Seule une partie solo (un unique joueur actif, vous-meme) ou sans personnage finalise (vous en tant que createur) peut etre supprimee directement - quittez la partie sinon.',
      );
    }

    await this.cascade.execute(input.sessionId);
  }
}
