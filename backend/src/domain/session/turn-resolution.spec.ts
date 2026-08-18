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

  it('defaults diceRolls to an empty array for a pure-narration turn', () => {
    const resolution = TurnResolution.create({
      sessionId: 'session-1',
      turnNumber: 1,
      narrationText: 'texte',
    });

    expect(resolution.diceRolls).toEqual([]);
  });

  it('carries the dice rolled for this turn mechanical actions', () => {
    const resolution = TurnResolution.create({
      sessionId: 'session-1',
      turnNumber: 1,
      narrationText: 'texte',
      diceRolls: [
        {
          playerId: 'user-1',
          actionKey: 'melee-attack',
          actionLabel: 'Attaque au corps à corps',
          formula: '1d20+3',
          rolls: [14],
          total: 17,
        },
      ],
    });

    expect(resolution.diceRolls).toHaveLength(1);
    expect(resolution.diceRolls[0].total).toBe(17);
  });
});
