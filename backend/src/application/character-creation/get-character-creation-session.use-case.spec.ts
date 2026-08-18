import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { GetCharacterCreationSessionUseCase } from './get-character-creation-session.use-case';
import { InMemoryCharacterCreationSessionRepository } from './in-memory-character-creation-session.repository';

function buildCreationSession() {
  return CharacterCreationSession.create({
    gameSessionId: 'game-session-1',
    gameSystemId: 'game-system-1',
    userId: 'user-1',
  });
}

describe('GetCharacterCreationSessionUseCase', () => {
  it('returns the session when the requester owns it', async () => {
    const creationSession = buildCreationSession();
    const repository = new InMemoryCharacterCreationSessionRepository([
      creationSession,
    ]);
    const useCase = new GetCharacterCreationSessionUseCase(repository);

    const result = await useCase.execute(creationSession.id, 'user-1');

    expect(result.id).toBe(creationSession.id);
  });

  it('throws NotFoundException when the session does not exist', async () => {
    const useCase = new GetCharacterCreationSessionUseCase(
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow();
  });

  it('throws ForbiddenException when the requester does not own the session', async () => {
    const creationSession = buildCreationSession();
    const repository = new InMemoryCharacterCreationSessionRepository([
      creationSession,
    ]);
    const useCase = new GetCharacterCreationSessionUseCase(repository);

    await expect(
      useCase.execute(creationSession.id, 'someone-else'),
    ).rejects.toThrow();
  });
});
