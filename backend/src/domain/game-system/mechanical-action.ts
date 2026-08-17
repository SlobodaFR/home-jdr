/**
 * An action that, when submitted by a player, must trigger a real server-side
 * dice roll (see PRD.md - "Dés hybrides") instead of pure narration.
 * Consumed later by 04-llm-orchestration.
 */
export interface MechanicalAction {
  actionKey: string;
  label: string;
  diceFormula: string;
  relatedStat?: string;
}

const DICE_FORMULA_PATTERN = /^\d+d\d+([+-]\d+)?$/i;

export function validateMechanicalActions(actions: MechanicalAction[]): void {
  if (!Array.isArray(actions)) {
    throw new Error('mechanicalActions must be an array');
  }

  const seenKeys = new Set<string>();
  for (const action of actions) {
    if (!action.actionKey || !action.label) {
      throw new Error(
        'Each mechanical action requires an actionKey and a label',
      );
    }
    if (seenKeys.has(action.actionKey)) {
      throw new Error(`Duplicate mechanical action key: ${action.actionKey}`);
    }
    seenKeys.add(action.actionKey);

    if (!DICE_FORMULA_PATTERN.test(action.diceFormula)) {
      throw new Error(
        `Invalid dice formula for action "${action.actionKey}": ${action.diceFormula}`,
      );
    }
  }
}
