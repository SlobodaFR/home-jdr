import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { CharacterCreationSessionRepository } from '../../domain/character-creation/character-creation-session.repository';

/** Test double shared by the character-creation use-case specs. */
export class InMemoryCharacterCreationSessionRepository extends CharacterCreationSessionRepository {
  constructor(private sessions: CharacterCreationSession[] = []) {
    super();
  }

  findById(id: string): Promise<CharacterCreationSession | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }

  findByGameSessionAndUser(
    gameSessionId: string,
    userId: string,
  ): Promise<CharacterCreationSession | null> {
    return Promise.resolve(
      this.sessions.find(
        (s) => s.gameSessionId === gameSessionId && s.userId === userId,
      ) ?? null,
    );
  }

  save(session: CharacterCreationSession): Promise<void> {
    this.sessions = [
      ...this.sessions.filter((s) => s.id !== session.id),
      session,
    ];
    return Promise.resolve();
  }

  deleteByGameSessionId(gameSessionId: string): Promise<void> {
    this.sessions = this.sessions.filter(
      (s) => s.gameSessionId !== gameSessionId,
    );
    return Promise.resolve();
  }

  findInProgressByGameSessionId(
    gameSessionId: string,
  ): Promise<CharacterCreationSession[]> {
    return Promise.resolve(
      this.sessions.filter(
        (s) => s.gameSessionId === gameSessionId && s.status === 'in_progress',
      ),
    );
  }
}
