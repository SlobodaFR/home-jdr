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
 * Permanently deletes a session, but only when it is genuinely solo:
 * exactly one active `SessionPlayer`, and the requester IS that player.
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
    if (!isSoloOwnedByRequester) {
      throw new ForbiddenException(
        'Seule une partie solo (un unique joueur actif, vous-meme) peut etre supprimee directement - quittez la partie sinon.',
      );
    }

    await this.cascade.execute(input.sessionId);
  }
}
