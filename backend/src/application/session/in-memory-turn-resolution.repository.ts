import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';

/** Test double shared by the session use-case specs. */
export class InMemoryTurnResolutionRepository extends TurnResolutionRepository {
  constructor(private resolutions: TurnResolution[] = []) {
    super();
  }

  findRecentBySessionId(
    sessionId: string,
    limit: number,
  ): Promise<TurnResolution[]> {
    const sorted = this.resolutions
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => b.turnNumber - a.turnNumber);
    return Promise.resolve(sorted.slice(0, limit));
  }

  save(resolution: TurnResolution): Promise<void> {
    this.resolutions = [
      ...this.resolutions.filter((r) => r.id !== resolution.id),
      resolution,
    ];
    return Promise.resolve();
  }
}
