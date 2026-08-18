import { Injectable } from '@nestjs/common';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { MapPin } from '../../domain/world-map/map-pin';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMap } from '../../domain/world-map/world-map';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';
import { assertSessionAccess } from './assert-session-access';

export interface GetWorldMapInput {
  sessionId: string;
  userId: string;
}

export interface WorldMapView {
  worldMap: WorldMap;
  pins: MapPin[];
}

/** Fetches a session's world map and its pins, or `null` if none was generated yet. */
@Injectable()
export class GetWorldMapUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly mapPinRepository: MapPinRepository,
  ) {}

  async execute(input: GetWorldMapInput): Promise<WorldMapView | null> {
    await assertSessionAccess(
      input.sessionId,
      input.userId,
      this.gameSessionRepository,
      this.sessionPlayerRepository,
    );

    const worldMap = await this.worldMapRepository.findBySessionId(
      input.sessionId,
    );
    if (!worldMap) {
      return null;
    }

    const pins = await this.mapPinRepository.findByWorldMapId(worldMap.id);

    return { worldMap, pins };
  }
}
