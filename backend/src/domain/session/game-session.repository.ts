import { GameSession } from './game-session';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class GameSessionRepository {
  abstract findById(id: string): Promise<GameSession | null>;
  abstract findByInviteCode(inviteCode: string): Promise<GameSession | null>;
  /** Sessions the user created or is a `SessionPlayer` of ("Mes parties"). */
  abstract findForUser(userId: string): Promise<GameSession[]>;
  abstract save(session: GameSession): Promise<void>;
  /** Permanent delete - see `DeleteSessionCascade` (solo-delete / last-player-leaves). */
  abstract deleteById(id: string): Promise<void>;
}
