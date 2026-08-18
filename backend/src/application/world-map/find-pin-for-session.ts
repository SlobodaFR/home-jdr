import { NotFoundException } from '@nestjs/common';
import { MapPin } from '../../domain/world-map/map-pin';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';

/**
 * Resolves a pin by id and verifies it belongs to the given session's world
 * map - a pin id from another session's map is treated as not found rather
 * than leaking its existence.
 */
export async function findPinForSession(
  sessionId: string,
  pinId: string,
  worldMapRepository: WorldMapRepository,
  mapPinRepository: MapPinRepository,
): Promise<MapPin> {
  const worldMap = await worldMapRepository.findBySessionId(sessionId);
  if (!worldMap) {
    throw new NotFoundException(
      "Cette partie n'a pas encore de carte du monde.",
    );
  }

  const pin = await mapPinRepository.findById(pinId);
  if (!pin || pin.worldMapId !== worldMap.id) {
    throw new NotFoundException('Pin not found');
  }

  return pin;
}
