import { MapPin } from '../../domain/world-map/map-pin';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';

/** Test double shared by the world-map use-case specs. */
export class InMemoryMapPinRepository extends MapPinRepository {
  constructor(private pins: MapPin[] = []) {
    super();
  }

  findById(id: string): Promise<MapPin | null> {
    return Promise.resolve(this.pins.find((p) => p.id === id) ?? null);
  }

  findByWorldMapId(worldMapId: string): Promise<MapPin[]> {
    return Promise.resolve(
      this.pins.filter((p) => p.worldMapId === worldMapId),
    );
  }

  save(pin: MapPin): Promise<void> {
    this.pins = [...this.pins.filter((p) => p.id !== pin.id), pin];
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.pins = this.pins.filter((p) => p.id !== id);
    return Promise.resolve();
  }

  deleteByWorldMapId(worldMapId: string): Promise<void> {
    this.pins = this.pins.filter((p) => p.worldMapId !== worldMapId);
    return Promise.resolve();
  }
}
