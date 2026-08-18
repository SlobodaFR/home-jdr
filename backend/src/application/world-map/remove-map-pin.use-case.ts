import { Injectable } from '@nestjs/common';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';
import { assertSessionAccess } from './assert-session-access';
import { findPinForSession } from './find-pin-for-session';

export interface RemoveMapPinInput {
  sessionId: string;
  userId: string;
  pinId: string;
}

/** Removes a pin from the session's world map. */
@Injectable()
export class RemoveMapPinUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly mapPinRepository: MapPinRepository,
  ) {}

  async execute(input: RemoveMapPinInput): Promise<void> {
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

    await this.mapPinRepository.delete(pin.id);
  }
}
