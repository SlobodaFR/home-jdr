import { TurnResolution } from './turn-resolution';

describe('TurnResolution', () => {
  it('defaults resolvedAt to now', () => {
    const before = new Date();

    const resolution = TurnResolution.create({
      sessionId: 'session-1',
      turnNumber: 1,
      narrationText: 'La porte grince et s’ouvre sur un couloir sombre.',
    });

    expect(resolution.resolvedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it('rejects a turnNumber below 1', () => {
    expect(() =>
      TurnResolution.create({
        sessionId: 'session-1',
        turnNumber: 0,
        narrationText: 'texte',
      }),
    ).toThrow();
  });
});
