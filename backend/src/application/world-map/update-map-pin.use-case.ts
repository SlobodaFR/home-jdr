import { Injectable } from '@nestjs/common';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { MapPin } from '../../domain/world-map/map-pin';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';
import { assertSessionAccess } from './assert-session-access';
import { findPinForSession } from './find-pin-for-session';

export interface UpdateMapPinInput {
  sessionId: string;
  userId: string;
  pinId: string;
  label?: string;
  positionX?: number;
  positionY?: number;
  notes?: string;
}

/** Moves/renames/edits a pin already placed on the session's world map. */
@Injectable()
export class UpdateMapPinUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly mapPinRepository: MapPinRepository,
  ) {}

  async execute(input: UpdateMapPinInput): Promise<MapPin> {
    await assertSessionAccess(
      input.sessionId,
      input.userId,
      this.gameSessionRepository,
      this.sessionPlayerRepository,
    );

    const pin = await findPinForSession(
      input.sessionId,
      input.pinId,
      this.worldMapRepository,
      this.mapPinRepository,
    );

    const updated = pin.update({
      label: input.label,
      positionX: input.positionX,
      positionY: input.positionY,
      notes: input.notes,
    });

    await this.mapPinRepository.save(updated);

    return updated;
  }
}
