import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { WorldMap } from '../../domain/world-map/world-map';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { AddMapPinUseCase } from './add-map-pin.use-case';
import { InMemoryMapPinRepository } from './in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from './in-memory-world-map.repository';

describe('AddMapPinUseCase', () => {
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
    const useCase = new AddMapPinUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      worldMapRepository,
      mapPinRepository,
    );
    return { useCase, worldMap, mapPinRepository };
  }

  it('creates a pin linked to the session world map', async () => {
    const { useCase, worldMap, mapPinRepository } = await setUp();

    const pin = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
      label: 'Le village de Bree',
      positionX: 0.4,
      positionY: 0.6,
    });

    expect(pin.worldMapId).toBe(worldMap.id);
    await expect(mapPinRepository.findById(pin.id)).resolves.toEqual(pin);
  });

  it('rejects adding a pin when the session has no world map yet', async () => {
    const gameSessionRepository = new InMemoryGameSessionRepository([
      makeSession(),
    ]);
    const useCase = new AddMapPinUseCase(
      gameSessionRepository,
      new InMemorySessionPlayerRepository(),
      new InMemoryWorldMapRepository(),
      new InMemoryMapPinRepository(),
    );

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'gm-1',
        label: 'Le village de Bree',
        positionX: 0.4,
        positionY: 0.6,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a user who is neither the creator nor a SessionPlayer of the session', async () => {
    const { useCase } = await setUp();

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'stranger',
        label: 'Le village de Bree',
        positionX: 0.4,
        positionY: 0.6,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
