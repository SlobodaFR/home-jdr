import { WorldMap } from '../../domain/world-map/world-map';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';

/** Test double shared by the world-map use-case specs. */
export class InMemoryWorldMapRepository extends WorldMapRepository {
  constructor(private worldMaps: WorldMap[] = []) {
    super();
  }

  findBySessionId(sessionId: string): Promise<WorldMap | null> {
    return Promise.resolve(
      this.worldMaps.find((m) => m.sessionId === sessionId) ?? null,
    );
  }

  save(worldMap: WorldMap): Promise<void> {
    this.worldMaps = [
      ...this.worldMaps.filter((m) => m.id !== worldMap.id),
      worldMap,
    ];
    return Promise.resolve();
  }

  deleteBySessionId(sessionId: string): Promise<void> {
    this.worldMaps = this.worldMaps.filter((m) => m.sessionId !== sessionId);
    return Promise.resolve();
  }
}
