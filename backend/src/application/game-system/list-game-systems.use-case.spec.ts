import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { ListGameSystemsUseCase } from './list-game-systems.use-case';

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

describe('ListGameSystemsUseCase', () => {
  const characterSheetSchema: CharacterSheetSchema = {
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: [] },
    customAttributes: [],
  };
  const mechanicalActions: MechanicalAction[] = [];

  function makeGameSystem(
    name: string,
    adaptedForChildren: boolean,
  ): GameSystem {
    return GameSystem.create({
      name,
      description: '',
      adaptedForChildren,
      rulesText: '',
      rulesSourceFileName: `${name}.pdf`,
      characterSheetSchema,
      mechanicalActions,
    });
  }

  it('returns every game system for an admin or adult caller', async () => {
    const repository = new InMemoryGameSystemRepository([
      makeGameSystem('JdR adulte', false),
      makeGameSystem('JdR enfant', true),
    ]);
    const useCase = new ListGameSystemsUseCase(repository);

    await expect(useCase.execute('admin')).resolves.toHaveLength(2);
    await expect(useCase.execute('adult')).resolves.toHaveLength(2);
  });

  it('returns only game systems adapted for children for a child caller', async () => {
    const repository = new InMemoryGameSystemRepository([
      makeGameSystem('JdR adulte', false),
      makeGameSystem('JdR enfant', true),
    ]);
    const useCase = new ListGameSystemsUseCase(repository);

    const result = await useCase.execute('child');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('JdR enfant');
  });
});
