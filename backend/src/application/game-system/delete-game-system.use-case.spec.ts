import { ConflictException, NotFoundException } from '@nestjs/common';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { DeleteGameSystemUseCase } from './delete-game-system.use-case';

class InMemoryGameSystemRepository extends GameSystemRepository {
  constructor(private gameSystems: GameSystem[] = []) {
    super();
  }

  async findById(id: string): Promise<GameSystem | null> {
    return this.gameSystems.find((g) => g.id === id) ?? null;
  }

  async findAll(filter?: GameSystemListFilter): Promise<GameSystem[]> {
    return filter?.childSafeOnly
      ? this.gameSystems.filter((g) => g.adaptedForChildren)
      : this.gameSystems;
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

const CHARACTER_SHEET_SCHEMA: CharacterSheetSchema = {
  hitPoints: { defaultMax: 20 },
  inventory: { defaultItems: [] },
  customAttributes: [],
};

function buildGameSystem(): GameSystem {
  return GameSystem.create({
    id: 'game-system-1',
    name: 'Donjons & Dragons',
    description: 'JdR de fantasy',
    adaptedForChildren: false,
    rulesText: 'texte des regles',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: CHARACTER_SHEET_SCHEMA,
    mechanicalActions: [],
  });
}

describe('DeleteGameSystemUseCase', () => {
  it('throws NotFoundException when the game system does not exist', async () => {
    const useCase = new DeleteGameSystemUseCase(
      new InMemoryGameSystemRepository(),
      new InMemoryGameSessionRepository(),
    );

    await expect(
      useCase.execute({ gameSystemId: 'unknown-id' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the game system when no session has ever referenced it', async () => {
    const gameSystem = buildGameSystem();
    const gameSystemRepository = new InMemoryGameSystemRepository([gameSystem]);
    const useCase = new DeleteGameSystemUseCase(
      gameSystemRepository,
      new InMemoryGameSessionRepository(),
    );

    await useCase.execute({ gameSystemId: gameSystem.id });

    await expect(
      gameSystemRepository.findById(gameSystem.id),
    ).resolves.toBeNull();
  });

  it('rejects with a ConflictException carrying a clear message when a session actively references it', async () => {
    const gameSystem = buildGameSystem();
    const gameSystemRepository = new InMemoryGameSystemRepository([gameSystem]);
    const session = GameSession.create({
      gameSystemId: gameSystem.id,
      name: 'Une partie en cours',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
      status: 'waiting_for_players',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const useCase = new DeleteGameSystemUseCase(
      gameSystemRepository,
      gameSessionRepository,
    );

    await expect(
      useCase.execute({ gameSystemId: gameSystem.id }),
    ).rejects.toMatchObject({
      message:
        'Ce JdR est utilisé par au moins une partie et ne peut pas être supprimé.',
    });
    await expect(
      useCase.execute({ gameSystemId: gameSystem.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    // Never deleted.
    await expect(
      gameSystemRepository.findById(gameSystem.id),
    ).resolves.not.toBeNull();
  });

  it('rejects even when the only referencing session is not active (proves "any session ever", not just active ones)', async () => {
    const gameSystem = buildGameSystem();
    const gameSystemRepository = new InMemoryGameSystemRepository([gameSystem]);
    const narratingSession = GameSession.create({
      gameSystemId: gameSystem.id,
      name: 'Une partie deja resolue',
      inviteCode: 'AB12CD',
      createdByUserId: 'user-1',
      status: 'narrating',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([
      narratingSession,
    ]);
    const useCase = new DeleteGameSystemUseCase(
      gameSystemRepository,
      gameSessionRepository,
    );

    await expect(
      useCase.execute({ gameSystemId: gameSystem.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
