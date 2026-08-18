import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { MapPin } from '../../domain/world-map/map-pin';
import { WorldMap } from '../../domain/world-map/world-map';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { InMemoryMapPinRepository } from './in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from './in-memory-world-map.repository';
import { UpdateMapPinUseCase } from './update-map-pin.use-case';

describe('UpdateMapPinUseCase', () => {
  function makeSession(id = 'session-1'): GameSession {
    return GameSession.create({
      id,
      gameSystemId: 'game-system-1',
      name: 'Ma partie',
      inviteCode: 'XK4R2P',
      createdByUserId: 'gm-1',
    });
  }

  async function setUp() {
    const gameSessionRepository = new InMemoryGameSessionRepository([
      makeSession(),
      makeSession('session-2'),
    ]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository();
    const worldMapRepository = new InMemoryWorldMapRepository();
    const worldMap = WorldMap.create({
      sessionId: 'session-1',
      imageStorageKey: 'world-maps/session-1/map.png',
      generationPrompt: 'Carte du monde',
    });
    await worldMapRepository.save(worldMap);
    const otherWorldMap = WorldMap.create({
      sessionId: 'session-2',
      imageStorageKey: 'world-maps/session-2/map.png',
      generationPrompt: 'Carte du monde 2',
    });
    await worldMapRepository.save(otherWorldMap);

    const mapPinRepository = new InMemoryMapPinRepository();
    const pin = MapPin.create({
      worldMapId: worldMap.id,
      label: 'Le village de Bree',
      positionX: 0.4,
      positionY: 0.6,
      createdByUserId: 'gm-1',
    });
    await mapPinRepository.save(pin);
    const foreignPin = MapPin.create({
      worldMapId: otherWorldMap.id,
      label: 'Une autre carte',
      positionX: 0.1,
      positionY: 0.1,
      createdByUserId: 'gm-1',
    });
    await mapPinRepository.save(foreignPin);

    const useCase = new UpdateMapPinUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      worldMapRepository,
      mapPinRepository,
    );
    return { useCase, pin, foreignPin, mapPinRepository };
  }

  it('moves a pin to a new relative position', async () => {
    const { useCase, pin, mapPinRepository } = await setUp();

    const moved = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
      pinId: pin.id,
      positionX: 0.9,
      positionY: 0.1,
    });

    expect(moved.positionX).toBe(0.9);
    expect(moved.positionY).toBe(0.1);
    await expect(mapPinRepository.findById(pin.id)).resolves.toEqual(moved);
  });

  it('updates the label and notes', async () => {
    const { useCase, pin } = await setUp();

    const updated = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
      pinId: pin.id,
      label: 'Bree (renomme)',
      notes: 'Auberge du Poney Fringant',
    });

    expect(updated.label).toBe('Bree (renomme)');
    expect(updated.notes).toBe('Auberge du Poney Fringant');
  });

  it('rejects updating a pin that does not exist', async () => {
    const { useCase } = await setUp();

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'gm-1',
        pinId: 'unknown-pin',
        label: 'x',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects updating a pin that belongs to a different session's map", async () => {
    const { useCase, foreignPin } = await setUp();

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'gm-1',
        pinId: foreignPin.id,
        label: 'x',
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
        label: 'x',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
