export interface InventoryItem {
  name: string;
  quantity: number;
}

/**
 * Minimal structured shape of a `GameSystem.characterSheetSchema`, as
 * documented in `tasks/02-character-sheet.md` ("Contrat d'interface").
 * Mirrors `backend/src/domain/character/character-sheet-schema.ts`.
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

export interface Character {
  id: string;
  gameSystemId: string;
  sessionId: string;
  ownerUserId: string;
  name: string;
  hitPointsMax: number;
  hitPointsCurrent: number;
  inventory: InventoryItem[];
  customAttributes: Record<string, number | string>;
  createdAt: string;
  updatedAt: string;
}
