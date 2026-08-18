export interface DiceRollResult {
  /** The formula that was rolled, e.g. "1d20+3". */
  formula: string;
  /** Individual die results, before the modifier is applied. */
  rolls: number[];
  modifier: number;
  /** sum(rolls) + modifier. */
  total: number;
}

/**
 * Port (driven side) implemented by the infrastructure layer. Pure RNG, no
 * external dependency - dice are rolled server-side, before the LLM call
 * (see `PRD.md` - "Dés hybrides"), so the result can be injected into the
 * prompt as a non-negotiable fact instead of letting the LLM invent one.
 */
export abstract class DiceRollerPort {
  abstract roll(formula: string): DiceRollResult;
}
