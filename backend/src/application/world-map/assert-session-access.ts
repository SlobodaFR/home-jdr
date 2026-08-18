import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';

/**
 * Shared by every world-map use-case: only the session's creator or one of
 * its `SessionPlayer`s may view/modify its map (see
 * `tasks/05-world-map.md` - critere d'acceptation).
 */
export async function assertSessionAccess(
  sessionId: string,
  userId: string,
  gameSessionRepository: GameSessionRepository,
  sessionPlayerRepository: SessionPlayerRepository,
): Promise<GameSession> {
  const session = await gameSessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundException('Session not found');
  }
  if (session.createdByUserId === userId) {
    return session;
  }
  const player = await sessionPlayerRepository.findBySessionAndUser(
    sessionId,
    userId,
  );
  if (!player) {
    throw new ForbiddenException(
      "Vous ne faites pas partie de cette partie : impossible d'accéder à sa carte.",
    );
  }
  return session;
}
