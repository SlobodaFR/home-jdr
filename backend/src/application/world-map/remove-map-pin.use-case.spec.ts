import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { MapPin } from '../../domain/world-map/map-pin';
import { WorldMap } from '../../domain/world-map/world-map';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { InMemoryMapPinRepository } from './in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from './in-memory-world-map.repository';
import { RemoveMapPinUseCase } from './remove-map-pin.use-case';

describe('RemoveMapPinUseCase', () => {
  function makeSession(): GameSession {
    return GameSession.create({
      id: 'session-1',
      gameSystemId: 'game-system-1',
      name: 'Ma partie',
      inviteCode: 'XK4R2P',
      createdByUserId: 'gm-1',
    });
  }

  async function setUp() {
    const gameSessionRepository = new InMemoryGameSessionRepository([
      makeSession(),
    ]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository();
    const worldMapRepository = new InMemoryWorldMapRepository();
    const worldMap = WorldMap.create({
      sessionId: 'session-1',
      imageStorageKey: 'world-maps/session-1/map.png',
      generationPrompt: 'Carte du monde',
    });
    await worldMapRepository.save(worldMap);
    const mapPinRepository = new InMemoryMapPinRepository();
    const pin = MapPin.create({
      worldMapId: worldMap.id,
      label: 'Le village de Bree',
      positionX: 0.4,
      positionY: 0.6,
      createdByUserId: 'gm-1',
    });
    await mapPinRepository.save(pin);

    const useCase = new RemoveMapPinUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      worldMapRepository,
      mapPinRepository,
    );
    return { useCase, pin, mapPinRepository };
  }

  it('deletes the pin', async () => {
    const { useCase, pin, mapPinRepository } = await setUp();

    await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
      pinId: pin.id,
    });

    await expect(mapPinRepository.findById(pin.id)).resolves.toBeNull();
  });

  it('rejects deleting a pin that does not exist', async () => {
    const { useCase } = await setUp();

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'gm-1',
        pinId: 'unknown',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a user who is neither the creator nor a SessionPlayer of the session', async () => {
    const { useCase, pin } = await setUp();

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'stranger',
        pinId: pin.id,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
