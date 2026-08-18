import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';

/** Test double shared by the character/session use-case specs. */
export class InMemoryPendingCharacterDeltaRepository extends PendingCharacterDeltaRepository {
  constructor(private pendingDeltas: PendingCharacterDelta[] = []) {
    super();
  }

  findById(id: string): Promise<PendingCharacterDelta | null> {
    return Promise.resolve(
      this.pendingDeltas.find((delta) => delta.id === id) ?? null,
    );
  }

  findBySessionAndTurn(
    sessionId: string,
    turnNumber: number,
  ): Promise<PendingCharacterDelta[]> {
    return Promise.resolve(
      this.pendingDeltas.filter(
        (delta) =>
          delta.sessionId === sessionId && delta.turnNumber === turnNumber,
      ),
    );
  }

  save(pendingDelta: PendingCharacterDelta): Promise<void> {
    this.pendingDeltas = [
      ...this.pendingDeltas.filter((delta) => delta.id !== pendingDelta.id),
      pendingDelta,
    ];
    return Promise.resolve();
  }
}
