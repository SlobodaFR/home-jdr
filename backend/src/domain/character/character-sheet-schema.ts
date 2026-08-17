/**
 * Minimal structured shape of a `GameSystem.characterSheetSchema`, as
 * documented in `tasks/02-character-sheet.md` ("Contrat d'interface").
 *
 * This is a stub contract: `01-game-catalog` (built in parallel) owns the
 * real `GameSystem` entity and will produce schemas compatible with this
 * shape. This module intentionally has no dependency on `01-game-catalog`
 * code so the two tasks can be developed independently.
 */
export interface CharacterSheetCustomAttributeSchema {
  key: string;
  label: string;
  type: 'number' | 'string';
  default: number | string;
}

export interface CharacterSheetSchema {
  baseAttributes: {
    hitPoints: { max: number };
    inventory: string[];
  };
  customAttributes: CharacterSheetCustomAttributeSchema[];
}
