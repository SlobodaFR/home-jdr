import { MapPin } from './map-pin';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class MapPinRepository {
  abstract findById(id: string): Promise<MapPin | null>;
  abstract findByWorldMapId(worldMapId: string): Promise<MapPin[]>;
  abstract save(pin: MapPin): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** Bulk delete for `DeleteSessionCascade`. */
  abstract deleteByWorldMapId(worldMapId: string): Promise<void>;
}
