import { WorldMap } from './world-map';

/**
 * Port (driven side) implemented by the infrastructure layer. One map per
 * session in V1 (see `tasks/05-world-map.md` - hors perimetre).
 */
export abstract class WorldMapRepository {
  abstract findBySessionId(sessionId: string): Promise<WorldMap | null>;
  abstract save(worldMap: WorldMap): Promise<void>;
}
