import { Character } from '../../domain/character/character';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { ApplyCharacterDeltaUseCase } from './apply-character-delta.use-case';
import { InMemoryCharacterRepository } from './in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from './in-memory-pending-character-delta.repository';
import { ValidateCharacterDeltaUseCase } from './validate-character-delta.use-case';

function buildCharacter() {
  return Character.create({
    id: 'character-1',
    gameSystemId: 'game-system-1',
    sessionId: 'session-1',
    ownerUserId: 'user-1',
    name: 'Grognak',
    hitPointsMax: 30,
    hitPointsCurrent: 30,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ValidateCharacterDeltaUseCase', () => {
  it('applies the delta to the character sheet and marks it validated', async () => {
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter(),
    ]);
    const pending = PendingCharacterDelta.create({
      sessionId: 'session-1',
      turnNumber: 1,
      characterId: 'character-1',
      deltaPayload: { hitPoints: -12, inventoryAdd: ['Épée rouillée'] },
    });
    const pendingRepository = new InMemoryPendingCharacterDeltaRepository([
      pending,
    ]);
    const useCase = new ValidateCharacterDeltaUseCase(
      pendingRepository,
      new ApplyCharacterDeltaUseCase(characterRepository),
    );

    const result = await useCase.execute(pending.id);

    expect(result.status).toBe('validated');
    const updatedCharacter = await characterRepository.findById('character-1');
    expect(updatedCharacter?.hitPointsCurrent).toBe(18);
    expect(updatedCharacter?.inventory).toEqual([
      { name: 'Épée rouillée', quantity: 1 },
    ]);
    const stored = await pendingRepository.findById(pending.id);
    expect(stored?.status).toBe('validated');
  });

  it('throws when the delta does not exist', async () => {
    const useCase = new ValidateCharacterDeltaUseCase(
      new InMemoryPendingCharacterDeltaRepository(),
      new ApplyCharacterDeltaUseCase(new InMemoryCharacterRepository()),
    );

    await expect(useCase.execute('missing')).rejects.toThrow();
  });

  it('throws when the delta is already validated (no double-apply)', async () => {
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter(),
    ]);
    const pending = PendingCharacterDelta.create({
      sessionId: 'session-1',
      turnNumber: 1,
      characterId: 'character-1',
      deltaPayload: { hitPoints: -5 },
    });
    const pendingRepository = new InMemoryPendingCharacterDeltaRepository([
      pending,
    ]);
    const useCase = new ValidateCharacterDeltaUseCase(
      pendingRepository,
      new ApplyCharacterDeltaUseCase(characterRepository),
    );

    await useCase.execute(pending.id);

    await expect(useCase.execute(pending.id)).rejects.toThrow();
    const updatedCharacter = await characterRepository.findById('character-1');
    expect(updatedCharacter?.hitPointsCurrent).toBe(25); // only applied once
  });
});
