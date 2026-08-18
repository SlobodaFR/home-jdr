import { RandomDiceRollerAdapter } from './random-dice-roller.adapter';

/** Returns a fixed sequence of [0,1) values, one per call, then repeats the last. */
function fixedRng(sequence: number[]): () => number {
  let index = 0;
  return () => sequence[Math.min(index++, sequence.length - 1)];
}

describe('RandomDiceRollerAdapter', () => {
  it('rolls a single die with a modifier deterministically', () => {
    // rng() = 0.7 on a d20 -> floor(0.7 * 20) + 1 = 15
    const adapter = new RandomDiceRollerAdapter(fixedRng([0.7]));

    const result = adapter.roll('1d20+3');

    expect(result.rolls).toEqual([15]);
    expect(result.modifier).toBe(3);
    expect(result.total).toBe(18);
    expect(result.formula).toBe('1d20+3');
  });

  it('rolls multiple dice and sums them', () => {
    // 0 -> 1, 0.5 -> 4 (floor(0.5*6)+1=4), 0.99 -> 6
    const adapter = new RandomDiceRollerAdapter(fixedRng([0, 0.5, 0.99]));

    const result = adapter.roll('3d6');

    expect(result.rolls).toEqual([1, 4, 6]);
    expect(result.modifier).toBe(0);
    expect(result.total).toBe(11);
  });

  it('supports a negative modifier', () => {
    const adapter = new RandomDiceRollerAdapter(fixedRng([0]));

    const result = adapter.roll('1d4-1');

    expect(result.rolls).toEqual([1]);
    expect(result.modifier).toBe(-1);
    expect(result.total).toBe(0);
  });

  it('rejects a malformed formula', () => {
    const adapter = new RandomDiceRollerAdapter(fixedRng([0]));

    expect(() => adapter.roll('not-a-formula')).toThrow();
  });

  it('defaults to Math.random when no rng is injected', () => {
    const adapter = new RandomDiceRollerAdapter();

    const result = adapter.roll('1d6');

    expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.rolls[0]).toBeLessThanOrEqual(6);
  });
});
