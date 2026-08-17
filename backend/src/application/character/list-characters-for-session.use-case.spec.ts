import { Character } from '../../domain/character/character';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { InMemoryCharacterRepository } from './in-memory-character.repository';
import { ListCharactersForSessionUseCase } from './list-characters-for-session.use-case';

describe('ListCharactersForSessionUseCase', () => {
  const schema: CharacterSheetSchema = {
    baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
    customAttributes: [],
  };

  function makeCharacter(id: string, sessionId: string): Character {
    return Character.fromSchema({
      id,
      gameSystemId: 'game-system-1',
      sessionId,
      ownerUserId: 'user-1',
      name: `Character ${id}`,
      schema,
      now: new Date('2026-01-01'),
    });
  }

  it('returns only the characters belonging to the given session', async () => {
    const repository = new InMemoryCharacterRepository([
      makeCharacter('char-1', 'session-1'),
      makeCharacter('char-2', 'session-2'),
      makeCharacter('char-3', 'session-1'),
    ]);
    const useCase = new ListCharactersForSessionUseCase(repository);

    const characters = await useCase.execute('session-1');

    expect(characters.map((c) => c.id).sort()).toEqual(['char-1', 'char-3']);
  });

  it('returns an empty array when the session has no characters', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new ListCharactersForSessionUseCase(repository);

    await expect(useCase.execute('session-1')).resolves.toEqual([]);
  });
});
