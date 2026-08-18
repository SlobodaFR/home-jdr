import { Injectable } from '@nestjs/common';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { UserRole } from '../../domain/user/user-profile';

/**
 * Returns null (rather than throwing) both when the game system is unknown
 * and when a `child` caller requests one that is not adaptedForChildren -
 * the HTTP layer maps both to a 404, so existence is never leaked.
 */
@Injectable()
export class GetGameSystemUseCase {
  constructor(private readonly gameSystemRepository: GameSystemRepository) {}

  async execute(id: string, callerRole: UserRole): Promise<GameSystem | null> {
    const gameSystem = await this.gameSystemRepository.findById(id);
    if (!gameSystem) {
      return null;
    }
    if (callerRole === 'child' && !gameSystem.adaptedForChildren) {
      return null;
    }
    return gameSystem;
  }
}
