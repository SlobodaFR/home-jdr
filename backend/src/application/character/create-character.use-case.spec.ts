import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { CreateCharacterUseCase } from './create-character.use-case';
import { InMemoryCharacterRepository } from './in-memory-character.repository';

describe('CreateCharacterUseCase', () => {
  const schema: CharacterSheetSchema = {
    baseAttributes: {
      hitPoints: { max: 20 },
      inventory: [],
    },
    customAttributes: [
      { key: 'strength', label: 'Force', type: 'number', default: 10 },
    ],
  };

  it('initializes hitPointsCurrent to hitPointsMax and custom attributes to their defaults', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new CreateCharacterUseCase(repository);

    const character = await useCase.execute({
      gameSystemId: 'game-system-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
    });

    expect(character.hitPointsCurrent).toBe(20);
    expect(character.hitPointsMax).toBe(20);
    expect(character.customAttributes).toEqual({ strength: 10 });
  });

  it('persists the created character', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new CreateCharacterUseCase(repository);

    const character = await useCase.execute({
      gameSystemId: 'game-system-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
    });

    await expect(repository.findById(character.id)).resolves.not.toBeNull();
  });

  it('rejects a blank name', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new CreateCharacterUseCase(repository);

    await expect(
      useCase.execute({
        gameSystemId: 'game-system-1',
        sessionId: 'session-1',
        ownerUserId: 'user-1',
        name: '   ',
        schema,
      }),
    ).rejects.toThrow();
  });
});
