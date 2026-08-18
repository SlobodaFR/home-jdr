import { CharacterSheetSchema, CustomAttributeType } from '../../domain/game-system';

export interface CustomAttributeDraft {
  key: string;
  label: string;
  type: CustomAttributeType;
  default: string;
}

export interface CharacterSheetSchemaDraft {
  hitPointsDefaultMax: string;
  inventoryDefaultItems: string[];
  customAttributes: CustomAttributeDraft[];
}

export function emptyCharacterSheetSchemaDraft(): CharacterSheetSchemaDraft {
  return { hitPointsDefaultMax: '20', inventoryDefaultItems: [], customAttributes: [] };
}

/** Converts the field-by-field draft into the JSON payload expected by the API. */
export function toCharacterSheetSchema(draft: CharacterSheetSchemaDraft): CharacterSheetSchema {
  return {
    hitPoints: { defaultMax: Number(draft.hitPointsDefaultMax) || 0 },
    inventory: { defaultItems: draft.inventoryDefaultItems.filter((item) => item.trim() !== '') },
    customAttributes: draft.customAttributes
      .filter((attribute) => attribute.key.trim() !== '')
      .map((attribute) => ({
        key: attribute.key,
        label: attribute.label,
        type: attribute.type,
        default: attribute.type === 'number' ? Number(attribute.default) || 0 : attribute.default,
      })),
  };
}
