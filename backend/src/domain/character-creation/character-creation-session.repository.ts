import { CharacterCreationSession } from './character-creation-session';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class CharacterCreationSessionRepository {
  abstract findById(id: string): Promise<CharacterCreationSession | null>;
  /** Used by `JoinSessionUseCase`/`CreateSessionUseCase` idempotence: at most one creation session per (session, user), regardless of status. */
  abstract findByGameSessionAndUser(
    gameSessionId: string,
    userId: string,
  ): Promise<CharacterCreationSession | null>;
  abstract save(session: CharacterCreationSession): Promise<void>;
  /** Bulk delete for `DeleteSessionCascade` - including sessions still `in_progress`. */
  abstract deleteByGameSessionId(gameSessionId: string): Promise<void>;
  /**
   * Every `in_progress` creation session for this game session, regardless
   * of user - used by `FinalizeCharacterCreationUseCase` to decide whether
   * every player is now ready (see `NarrateSessionOpeningUseCase` trigger:
   * fires once this returns empty).
   */
  abstract findInProgressByGameSessionId(
    gameSessionId: string,
  ): Promise<CharacterCreationSession[]>;
}
