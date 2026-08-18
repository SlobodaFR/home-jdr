import { TurnSubmission } from './turn-submission';

describe('TurnSubmission', () => {
  function createSubmission(
    overrides: Partial<{ actionText: string; turnNumber: number }> = {},
  ) {
    return TurnSubmission.create({
      sessionId: 'session-1',
      turnNumber: overrides.turnNumber ?? 1,
      playerId: 'user-1',
      actionText: overrides.actionText ?? "J'ouvre la porte",
    });
  }

  it('trims the action text', () => {
    const submission = createSubmission({ actionText: '  J’explore  ' });

    expect(submission.actionText).toBe('J’explore');
  });

  it('rejects a blank action text', () => {
    expect(() => createSubmission({ actionText: '   ' })).toThrow();
  });

  it('rejects a turnNumber below 1', () => {
    expect(() => createSubmission({ turnNumber: 0 })).toThrow();
  });

  it('defaults submittedAt to now', () => {
    const before = new Date();

    const submission = createSubmission();

    expect(submission.submittedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });
});
