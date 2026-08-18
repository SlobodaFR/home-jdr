import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MapPin } from '../../domain/world-map/map-pin';
import { GameSession } from '../../domain/session/game-session';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { GetWorldMapUseCase } from './get-world-map.use-case';
import { InMemoryMapPinRepository } from './in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from './in-memory-world-map.repository';
import { WorldMap } from '../../domain/world-map/world-map';

describe('GetWorldMapUseCase', () => {
  function makeSession(): GameSession {
    return GameSession.create({
      id: 'session-1',
      gameSystemId: 'game-system-1',
      name: 'Ma partie',
      inviteCode: 'XK4R2P',
      createdByUserId: 'gm-1',
    });
  }

  function setUp() {
    const gameSessionRepository = new InMemoryGameSessionRepository([
      makeSession(),
    ]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository();
    const worldMapRepository = new InMemoryWorldMapRepository();
    const mapPinRepository = new InMemoryMapPinRepository();
    const useCase = new GetWorldMapUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      worldMapRepository,
      mapPinRepository,
    );
    return { useCase, worldMapRepository, mapPinRepository };
  }

  it('returns null when no map has been generated yet for the session', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'gm-1' }),
    ).resolves.toBeNull();
  });

  it('returns the world map and its pins', async () => {
    const { useCase, worldMapRepository, mapPinRepository } = setUp();
    const worldMap = WorldMap.create({
      sessionId: 'session-1',
      imageStorageKey: 'world-maps/session-1/map.png',
      generationPrompt: 'Carte du monde',
    });
    await worldMapRepository.save(worldMap);
    const pin = MapPin.create({
      worldMapId: worldMap.id,
      label: 'Le village de Bree',
      positionX: 0.5,
      positionY: 0.5,
      createdByUserId: 'gm-1',
    });
    await mapPinRepository.save(pin);

    const result = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
    });

    expect(result?.worldMap.id).toBe(worldMap.id);
    expect(result?.pins).toEqual([pin]);
  });

  it('rejects a user who is neither the creator nor a SessionPlayer of the session', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'stranger' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown session', async () => {
    const { useCase } = setUp();

    await expect(
      useCase.execute({ sessionId: 'unknown', userId: 'gm-1' }),
    ).rejects.toThrow(NotFoundException);
  });
});
