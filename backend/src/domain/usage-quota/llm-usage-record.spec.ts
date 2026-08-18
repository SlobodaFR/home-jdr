import { LlmUsageRecord } from './llm-usage-record';

describe('LlmUsageRecord', () => {
  it('creates a record with the given props and an auto-generated id', () => {
    const occurredAt = new Date('2026-03-10T12:00:00.000Z');
    const record = LlmUsageRecord.create({
      sessionId: 'session-1',
      turnNumber: 3,
      provider: 'claude',
      callType: 'scene_resolution',
      occurredAt,
    });

    expect(record.id).toEqual(expect.any(String));
    expect(record.id).not.toHaveLength(0);
    expect(record.sessionId).toBe('session-1');
    expect(record.turnNumber).toBe(3);
    expect(record.provider).toBe('claude');
    expect(record.callType).toBe('scene_resolution');
    expect(record.occurredAt).toBe(occurredAt);
  });

  it('accepts an explicit id (used when rehydrating from persistence)', () => {
    const record = LlmUsageRecord.create({
      id: 'usage-1',
      sessionId: 'session-1',
      turnNumber: 1,
      provider: 'openai',
      callType: 'summary',
      occurredAt: new Date('2026-03-10T12:00:00.000Z'),
    });

    expect(record.id).toBe('usage-1');
  });
});
