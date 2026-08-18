import { Injectable, NotFoundException } from '@nestjs/common';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { MapPin } from '../../domain/world-map/map-pin';
import { MapPinRepository } from '../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../domain/world-map/world-map.repository';
import { assertSessionAccess } from './assert-session-access';

export interface AddMapPinInput {
  sessionId: string;
  userId: string;
  label: string;
  positionX: number;
  positionY: number;
  notes?: string;
}

/** Places a manual pin on the session's world map (never LLM-driven, see PRD.md). */
@Injectable()
export class AddMapPinUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly worldMapRepository: WorldMapRepository,
    private readonly mapPinRepository: MapPinRepository,
  ) {}

  async execute(input: AddMapPinInput): Promise<MapPin> {
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
      throw new NotFoundException(
        "Cette partie n'a pas encore de carte du monde.",
      );
    }

    const pin = MapPin.create({
      worldMapId: worldMap.id,
      label: input.label,
      positionX: input.positionX,
      positionY: input.positionY,
      notes: input.notes,
      createdByUserId: input.userId,
    });

    await this.mapPinRepository.save(pin);

    return pin;
  }
}
