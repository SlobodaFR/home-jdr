import { PendingCharacterDelta } from './pending-character-delta';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class PendingCharacterDeltaRepository {
  abstract findById(id: string): Promise<PendingCharacterDelta | null>;
  abstract findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<PendingCharacterDelta[]>;
  abstract save(pendingDelta: PendingCharacterDelta): Promise<void>;
  /** Bulk delete for `DeleteSessionCascade`. */
  abstract deleteBySessionId(sessionId: string): Promise<void>;
}
