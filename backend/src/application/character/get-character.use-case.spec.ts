import { NotFoundException } from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { GetCharacterUseCase } from './get-character.use-case';
import { InMemoryCharacterRepository } from './in-memory-character.repository';

describe('GetCharacterUseCase', () => {
  const schema: CharacterSheetSchema = {
    baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
    customAttributes: [],
  };

  it('returns the character when it exists', async () => {
    const character = Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
    const repository = new InMemoryCharacterRepository([character]);
    const useCase = new GetCharacterUseCase(repository);

    await expect(useCase.execute('char-1')).resolves.toBe(character);
  });

  it('throws NotFoundException when the character does not exist', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new GetCharacterUseCase(repository);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });
});
