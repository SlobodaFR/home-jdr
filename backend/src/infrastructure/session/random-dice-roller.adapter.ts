import { Injectable, Optional } from '@nestjs/common';
import {
  DiceRollerPort,
  DiceRollResult,
} from '../../domain/session/dice-roller.port';

const FORMULA_PATTERN = /^(\d+)d(\d+)([+-]\d+)?$/i;

/**
 * Standard `XdY[+Z]` dice roller (see `GameSystem.mechanicalActions[].diceFormula`,
 * validated against the same pattern in `domain/game-system/mechanical-action.ts`).
 *
 * The RNG itself is injected (defaults to `Math.random`) so tests can supply
 * a fixed sequence and assert on a deterministic result - see
 * `random-dice-roller.adapter.spec.ts`. `@Optional()` tells Nest's DI
 * container this constructor parameter is not meant to be resolved from the
 * module graph (there is no `Function`-typed provider registered anywhere,
 * nor should there be) - without it, Nest throws
 * "Nest can't resolve dependencies..." trying to inject a provider for the
 * reflected `Function` type instead of leaving the parameter to its default.
 */
@Injectable()
export class RandomDiceRollerAdapter extends DiceRollerPort {
  constructor(@Optional() private readonly rng: () => number = Math.random) {
    super();
  }

  roll(formula: string): DiceRollResult {
    const match = FORMULA_PATTERN.exec(formula.trim());
    if (!match) {
      throw new Error(`Invalid dice formula: "${formula}"`);
    }

    const diceCount = Number(match[1]);
    const diceSides = Number(match[2]);
    const modifier = match[3] ? Number(match[3]) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < diceCount; i += 1) {
      rolls.push(Math.floor(this.rng() * diceSides) + 1);
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    return { formula, rolls, modifier, total };
  }
}
