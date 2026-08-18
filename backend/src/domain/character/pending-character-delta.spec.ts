import { PendingCharacterDelta } from './pending-character-delta';

function buildPending(
  overrides: Partial<Parameters<typeof PendingCharacterDelta.create>[0]> = {},
) {
  return PendingCharacterDelta.create({
    sessionId: 'session-1',
    turnNumber: 1,
    characterId: 'character-1',
    deltaPayload: { hitPoints: -12, inventoryAdd: ['Épée rouillée'] },
    ...overrides,
  });
}

describe('PendingCharacterDelta', () => {
  it('defaults to status "pending"', () => {
    const pending = buildPending();
    expect(pending.status).toBe('pending');
  });

  it('rejects a turnNumber below 1', () => {
    expect(() => buildPending({ turnNumber: 0 })).toThrow();
  });

  it('rebuilds the CharacterStateDelta VO from the stored payload', () => {
    const pending = buildPending();
    const delta = pending.toDelta();
    expect(delta.hitPoints).toBe(-12);
    expect(delta.inventoryAdd).toEqual(['Épée rouillée']);
  });

  it('validate() transitions pending -> validated', () => {
    const pending = buildPending();
    const validated = pending.validate();
    expect(validated.status).toBe('validated');
    expect(pending.status).toBe('pending'); // immutable
  });

  it('reject() transitions pending -> rejected', () => {
    const pending = buildPending();
    const rejected = pending.reject();
    expect(rejected.status).toBe('rejected');
  });

  it('cannot validate a delta that is not pending', () => {
    const validated = buildPending().validate();
    expect(() => validated.validate()).toThrow();
  });

  it('cannot reject a delta that is not pending', () => {
    const rejected = buildPending().reject();
    expect(() => rejected.reject()).toThrow();
  });
});
