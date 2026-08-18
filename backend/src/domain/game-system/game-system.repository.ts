import { GameSystem } from './game-system';

export interface GameSystemListFilter {
  /** When true, only game systems flagged adaptedForChildren are returned. */
  childSafeOnly?: boolean;
}

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class GameSystemRepository {
  abstract findById(id: string): Promise<GameSystem | null>;
  abstract findAll(filter?: GameSystemListFilter): Promise<GameSystem[]>;
  abstract save(gameSystem: GameSystem): Promise<void>;
  /** Permanent delete - see `DeleteGameSystemUseCase` (guarded: never used by an existing session). */
  abstract deleteById(id: string): Promise<void>;
}
