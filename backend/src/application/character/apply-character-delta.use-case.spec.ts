import { NotFoundException } from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { CharacterStateDelta } from '../../domain/character/character-state-delta';
import { ApplyCharacterDeltaUseCase } from './apply-character-delta.use-case';
import { InMemoryCharacterRepository } from './in-memory-character.repository';

describe('ApplyCharacterDeltaUseCase', () => {
  const schema: CharacterSheetSchema = {
    baseAttributes: { hitPoints: { max: 20 }, inventory: ['torch'] },
    customAttributes: [
      { key: 'strength', label: 'Force', type: 'number', default: 10 },
    ],
  };

  function makeCharacter(): Character {
    return Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
  }

  it('applies a partial delta and persists the result', async () => {
    const repository = new InMemoryCharacterRepository([makeCharacter()]);
    const useCase = new ApplyCharacterDeltaUseCase(repository);

    const updated = await useCase.execute(
      'char-1',
      CharacterStateDelta.create({ hitPoints: -5 }),
    );

    expect(updated.hitPointsCurrent).toBe(15);
    expect(updated.inventory).toEqual([{ name: 'torch', quantity: 1 }]);
    const persisted = await repository.findById('char-1');
    expect(persisted?.hitPointsCurrent).toBe(15);
  });

  it('clips hitPointsCurrent between 0 and hitPointsMax', async () => {
    const repository = new InMemoryCharacterRepository([makeCharacter()]);
    const useCase = new ApplyCharacterDeltaUseCase(repository);

    const damaged = await useCase.execute(
      'char-1',
      CharacterStateDelta.create({ hitPoints: -999 }),
    );
    expect(damaged.hitPointsCurrent).toBe(0);

    const healed = await useCase.execute(
      'char-1',
      CharacterStateDelta.create({ hitPoints: 999 }),
    );
    expect(healed.hitPointsCurrent).toBe(20);
  });

  it('throws NotFoundException when the character does not exist', async () => {
    const repository = new InMemoryCharacterRepository();
    const useCase = new ApplyCharacterDeltaUseCase(repository);

    await expect(
      useCase.execute('missing', CharacterStateDelta.create({ hitPoints: -5 })),
    ).rejects.toThrow(NotFoundException);
  });
});
