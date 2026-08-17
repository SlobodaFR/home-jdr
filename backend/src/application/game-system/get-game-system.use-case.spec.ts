import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { GetGameSystemUseCase } from './get-game-system.use-case';

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
}

describe('GetGameSystemUseCase', () => {
  const characterSheetSchema: CharacterSheetSchema = {
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: [] },
    customAttributes: [],
  };
  const mechanicalActions: MechanicalAction[] = [];

  function makeGameSystem(adaptedForChildren: boolean): GameSystem {
    return GameSystem.create({
      name: 'JdR',
      description: '',
      adaptedForChildren,
      rulesText: '',
      rulesSourceFileName: 'jdr.pdf',
      characterSheetSchema,
      mechanicalActions,
    });
  }

  it('returns null when the game system does not exist', async () => {
    const useCase = new GetGameSystemUseCase(
      new InMemoryGameSystemRepository(),
    );

    await expect(useCase.execute('unknown-id', 'admin')).resolves.toBeNull();
  });

  it('returns the game system for an admin/adult caller regardless of the flag', async () => {
    const gameSystem = makeGameSystem(false);
    const useCase = new GetGameSystemUseCase(
      new InMemoryGameSystemRepository([gameSystem]),
    );

    await expect(useCase.execute(gameSystem.id, 'adult')).resolves.toBe(
      gameSystem,
    );
  });

  it('returns null for a child caller when the game system is not adapted for children', async () => {
    const gameSystem = makeGameSystem(false);
    const useCase = new GetGameSystemUseCase(
      new InMemoryGameSystemRepository([gameSystem]),
    );

    await expect(useCase.execute(gameSystem.id, 'child')).resolves.toBeNull();
  });

  it('returns the game system for a child caller when it is adapted for children', async () => {
    const gameSystem = makeGameSystem(true);
    const useCase = new GetGameSystemUseCase(
      new InMemoryGameSystemRepository([gameSystem]),
    );

    await expect(useCase.execute(gameSystem.id, 'child')).resolves.toBe(
      gameSystem,
    );
  });
});
