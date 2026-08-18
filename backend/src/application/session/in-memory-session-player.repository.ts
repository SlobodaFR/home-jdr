import { SessionPlayer } from '../../domain/session/session-player';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';

/** Test double shared by the session use-case specs. */
export class InMemorySessionPlayerRepository extends SessionPlayerRepository {
  constructor(private players: SessionPlayer[] = []) {
    super();
  }

  findBySessionId(sessionId: string): Promise<SessionPlayer[]> {
    return Promise.resolve(
      this.players.filter((p) => p.sessionId === sessionId),
    );
  }

  findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<SessionPlayer | null> {
    return Promise.resolve(
      this.players.find(
        (p) => p.sessionId === sessionId && p.userId === userId,
      ) ?? null,
    );
  }

  save(player: SessionPlayer): Promise<void> {
    this.players = [
      ...this.players.filter(
        (p) =>
          !(p.sessionId === player.sessionId && p.userId === player.userId),
      ),
      player,
    ];
    return Promise.resolve();
  }
}
