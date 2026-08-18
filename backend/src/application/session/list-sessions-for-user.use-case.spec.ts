import { GameSession } from '../../domain/session/game-session';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { ListSessionsForUserUseCase } from './list-sessions-for-user.use-case';

describe('ListSessionsForUserUseCase', () => {
  it('delegates to the repository', async () => {
    const session = GameSession.create({
      gameSystemId: 'game-system-1',
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
    const repository = new InMemoryGameSessionRepository([session]);
    const useCase = new ListSessionsForUserUseCase(repository);

    const sessions = await useCase.execute('user-1');

    expect(sessions).toEqual([session]);
  });
});
