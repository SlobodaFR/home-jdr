import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';

/** Test double shared by the session use-case specs. */
export class InMemoryGameSessionRepository extends GameSessionRepository {
  constructor(private sessions: GameSession[] = []) {
    super();
  }

  findById(id: string): Promise<GameSession | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }

  findByInviteCode(inviteCode: string): Promise<GameSession | null> {
    return Promise.resolve(
      this.sessions.find((s) => s.inviteCode === inviteCode) ?? null,
    );
  }

  findForUser(userId: string): Promise<GameSession[]> {
    return Promise.resolve(
      this.sessions.filter((s) => s.createdByUserId === userId),
    );
  }

  findAll(): Promise<GameSession[]> {
    return Promise.resolve([...this.sessions]);
  }

  existsByGameSystemId(gameSystemId: string): Promise<boolean> {
    return Promise.resolve(
      this.sessions.some((s) => s.gameSystemId === gameSystemId),
    );
  }

  save(session: GameSession): Promise<void> {
    this.sessions = [
      ...this.sessions.filter((s) => s.id !== session.id),
      session,
    ];
    return Promise.resolve();
  }

  deleteById(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    return Promise.resolve();
  }
}
