import { Injectable } from '@nestjs/common';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { UserRole } from '../../domain/user/user-profile';

/** Lists the catalog, filtered to child-safe game systems for a `child` caller. */
@Injectable()
export class ListGameSystemsUseCase {
  constructor(private readonly gameSystemRepository: GameSystemRepository) {}

  async execute(callerRole: UserRole): Promise<GameSystem[]> {
    return this.gameSystemRepository.findAll({
      childSafeOnly: callerRole === 'child',
    });
  }
}
