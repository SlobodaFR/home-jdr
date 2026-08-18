import { TurnSubmission } from './turn-submission';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class TurnSubmissionRepository {
  abstract findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<TurnSubmission[]>;
  abstract save(submission: TurnSubmission): Promise<void>;
  /** Bulk delete for `DeleteSessionCascade`. */
  abstract deleteBySessionId(sessionId: string): Promise<void>;
}
