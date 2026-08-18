import { Injectable } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';

/** Powers the "Mes parties" screen. */
@Injectable()
export class ListSessionsForUserUseCase {
  constructor(private readonly gameSessionRepository: GameSessionRepository) {}

  execute(userId: string): Promise<GameSession[]> {
    return this.gameSessionRepository.findForUser(userId);
  }
}
