import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { GameSystem } from '../../domain/game-system/game-system';

/** Test double shared by use-case specs that need a `GameSystemRepository`. */
export class InMemoryGameSystemRepository extends GameSystemRepository {
  constructor(private gameSystems: GameSystem[] = []) {
    super();
  }

  findById(id: string): Promise<GameSystem | null> {
    return Promise.resolve(
      this.gameSystems.find((gameSystem) => gameSystem.id === id) ?? null,
    );
  }

  findAll(filter?: GameSystemListFilter): Promise<GameSystem[]> {
    if (filter?.childSafeOnly) {
      return Promise.resolve(
        this.gameSystems.filter((gameSystem) => gameSystem.adaptedForChildren),
      );
    }
    return Promise.resolve([...this.gameSystems]);
  }

  save(gameSystem: GameSystem): Promise<void> {
    this.gameSystems = [
      ...this.gameSystems.filter((existing) => existing.id !== gameSystem.id),
      gameSystem,
    ];
    return Promise.resolve();
  }
}
