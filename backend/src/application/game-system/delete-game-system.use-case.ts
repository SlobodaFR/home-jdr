import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSessionRepository } from '../../domain/session/game-session.repository';

export interface DeleteGameSystemInput {
  gameSystemId: string;
}

/**
 * Permanently deletes a `GameSystem` from the catalog - admin-only (see
 * `GameSystemController`). Guarded: refused as long as at least one
 * `GameSession` - any status, ever created - still references this game
 * system, so a deletion can never orphan a session's rules text/schema.
 */
@Injectable()
export class DeleteGameSystemUseCase {
  constructor(
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly gameSessionRepository: GameSessionRepository,
  ) {}

  async execute(input: DeleteGameSystemInput): Promise<void> {
    const gameSystem = await this.gameSystemRepository.findById(
      input.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('JdR introuvable.');
    }

    const isUsedByASession =
      await this.gameSessionRepository.existsByGameSystemId(gameSystem.id);
    if (isUsedByASession) {
      throw new ConflictException(
        'Ce JdR est utilisé par au moins une partie et ne peut pas être supprimé.',
      );
    }

    await this.gameSystemRepository.deleteById(gameSystem.id);
  }
}
