import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { GenerateWorldMapUseCase } from './generate-world-map.use-case';
import { InMemoryImageGenerationPort } from './in-memory-image-generation.port';
import { InMemoryObjectStoragePort } from './in-memory-object-storage.port';
import { InMemoryWorldMapRepository } from './in-memory-world-map.repository';

class InMemoryGameSystemRepository extends GameSystemRepository {
  constructor(private gameSystems: GameSystem[] = []) {
    super();
  }

  async findById(id: string): Promise<GameSystem | null> {
    return this.gameSystems.find((g) => g.id === id) ?? null;
  }

  async findAll(): Promise<GameSystem[]> {
    return this.gameSystems;
  }

  async save(gameSystem: GameSystem): Promise<void> {
    this.gameSystems = [
      ...this.gameSystems.filter((g) => g.id !== gameSystem.id),
      gameSystem,
    ];
  }

  async deleteById(id: string): Promise<void> {
    this.gameSystems = this.gameSystems.filter((g) => g.id !== id);
  }
}

describe('GenerateWorldMapUseCase', () => {
  const characterSheetSchema: CharacterSheetSchema = {
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: [] },
    customAttributes: [],
  };

  function makeGameSystem(): GameSystem {
    return GameSystem.create({
      id: 'game-system-1',
      name: 'La quete du dragon',
      description: 'Fantasy sombre et féerique',
      adaptedForChildren: false,
      rulesText: '',
      rulesSourceFileName: 'jdr.pdf',
      characterSheetSchema,
      mechanicalActions: [],
    });
  }

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
    const gameSystemRepository = new InMemoryGameSystemRepository([
      makeGameSystem(),
    ]);
    const worldMapRepository = new InMemoryWorldMapRepository();
    const imageGenerationPort = new InMemoryImageGenerationPort();
    const objectStoragePort = new InMemoryObjectStoragePort();
    const useCase = new GenerateWorldMapUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      gameSystemRepository,
      worldMapRepository,
      imageGenerationPort,
      objectStoragePort,
    );
    return {
      useCase,
      worldMapRepository,
      imageGenerationPort,
      objectStoragePort,
    };
  }

  it('stores the generated image via the object-storage port and persists its storage key, never a raw URL', async () => {
    const { useCase, objectStoragePort } = setUp();

    const worldMap = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
    });

    expect(worldMap.imageStorageKey).toBeTruthy();
    expect(worldMap.imageStorageKey.startsWith('http')).toBe(false);
    expect(objectStoragePort.stored.has(worldMap.imageStorageKey)).toBe(true);
  });

  it('builds the generation prompt from the game system name and description', async () => {
    const { useCase, imageGenerationPort } = setUp();

    await useCase.execute({ sessionId: 'session-1', userId: 'gm-1' });

    expect(imageGenerationPort.prompts[0]).toContain('La quete du dragon');
    expect(imageGenerationPort.prompts[0]).toContain(
      'Fantasy sombre et féerique',
    );
  });

  it('appends the optional user description to the prompt', async () => {
    const { useCase, imageGenerationPort } = setUp();

    await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
      description: 'Avec une foret hantee au nord',
    });

    expect(imageGenerationPort.prompts[0]).toContain(
      'Avec une foret hantee au nord',
    );
  });

  it('reuses the same WorldMap id when regenerating, so existing pins stay linked', async () => {
    const { useCase, worldMapRepository } = setUp();

    const first = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
    });
    const second = await useCase.execute({
      sessionId: 'session-1',
      userId: 'gm-1',
    });

    expect(second.id).toBe(first.id);
    await expect(
      worldMapRepository.findBySessionId('session-1'),
    ).resolves.toMatchObject({
      id: first.id,
    });
  });

  it('allows a SessionPlayer (not just the creator) to generate the map', async () => {
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: 'session-1',
        userId: 'player-1',
        characterId: 'character-1',
      }),
    ]);
    const useCaseForPlayer = new GenerateWorldMapUseCase(
      new InMemoryGameSessionRepository([makeSession()]),
      sessionPlayerRepository,
      new InMemoryGameSystemRepository([makeGameSystem()]),
      new InMemoryWorldMapRepository(),
      new InMemoryImageGenerationPort(),
      new InMemoryObjectStoragePort(),
    );

    await expect(
      useCaseForPlayer.execute({ sessionId: 'session-1', userId: 'player-1' }),
    ).resolves.toBeDefined();
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
