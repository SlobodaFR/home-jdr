import { Character } from '../../domain/character/character';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { InMemoryCharacterRepository } from './in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from './in-memory-pending-character-delta.repository';
import { RejectCharacterDeltaUseCase } from './reject-character-delta.use-case';

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

describe('RejectCharacterDeltaUseCase', () => {
  it('marks the delta rejected and never touches the character sheet', async () => {
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter(),
    ]);
    const pending = PendingCharacterDelta.create({
      sessionId: 'session-1',
      turnNumber: 1,
      characterId: 'character-1',
      deltaPayload: { hitPoints: -12 },
    });
    const pendingRepository = new InMemoryPendingCharacterDeltaRepository([
      pending,
    ]);
    const useCase = new RejectCharacterDeltaUseCase(pendingRepository);

    const result = await useCase.execute(pending.id);

    expect(result.status).toBe('rejected');
    const character = await characterRepository.findById('character-1');
    expect(character?.hitPointsCurrent).toBe(30); // untouched
  });

  it('throws when the delta does not exist', async () => {
    const useCase = new RejectCharacterDeltaUseCase(
      new InMemoryPendingCharacterDeltaRepository(),
    );

    await expect(useCase.execute('missing')).rejects.toThrow();
  });
});
