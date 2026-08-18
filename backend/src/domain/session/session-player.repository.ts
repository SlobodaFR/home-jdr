import { SessionPlayer } from './session-player';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class SessionPlayerRepository {
  abstract findBySessionId(sessionId: string): Promise<SessionPlayer[]>;
  abstract findBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<SessionPlayer | null>;
  abstract save(player: SessionPlayer): Promise<void>;
}
