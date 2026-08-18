import { TurnResolution } from './turn-resolution';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class TurnResolutionRepository {
  /**
   * Returns at most `limit` of the most recent resolutions for `sessionId`,
   * ordered newest first. Must NOT load the full turn history - see
   * `GetSessionStateUseCase` (the polling endpoint must run in constant
   * time regardless of how many turns a session has accumulated).
   */
  abstract findRecentBySessionId(
    sessionId: string,
    limit: number,
  ): Promise<TurnResolution[]>;
  abstract save(resolution: TurnResolution): Promise<void>;
}
