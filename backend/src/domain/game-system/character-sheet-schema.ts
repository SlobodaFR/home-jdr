export type CustomAttributeType = 'number' | 'text';

export interface CustomAttribute {
  key: string;
  label: string;
  type: CustomAttributeType;
  default: number | string;
}

/**
 * Structured, admin-defined shape of a character sheet for a given
 * GameSystem. `name`, `hitPoints` and `inventory` are always present on any
 * character sheet (see PRD.md - "schéma structuré minimal") - this schema
 * only carries their defaults plus the JdR-specific custom attributes.
 */
export interface CharacterSheetSchema {
  hitPoints: { defaultMax: number };
  inventory: { defaultItems: string[] };
  customAttributes: CustomAttribute[];
}

/**
 * Structural validation, enforced on create and update. A safety net behind
 * the DTO validation already performed at the HTTP boundary - domain
 * invariants must hold regardless of the caller.
 */
export function validateCharacterSheetSchema(
  schema: CharacterSheetSchema,
): void {
  if (!schema || typeof schema !== 'object') {
    throw new Error('characterSheetSchema is required');
  }
  if (
    !schema.hitPoints ||
    !Number.isInteger(schema.hitPoints.defaultMax) ||
    schema.hitPoints.defaultMax < 1
  ) {
    throw new Error(
      'characterSheetSchema.hitPoints.defaultMax must be a positive integer',
    );
  }
  if (
    !schema.inventory ||
    !Array.isArray(schema.inventory.defaultItems) ||
    schema.inventory.defaultItems.some((item) => typeof item !== 'string')
  ) {
    throw new Error(
      'characterSheetSchema.inventory.defaultItems must be an array of strings',
    );
  }
  if (!Array.isArray(schema.customAttributes)) {
    throw new Error('characterSheetSchema.customAttributes must be an array');
  }

  const seenKeys = new Set<string>();
  for (const attribute of schema.customAttributes) {
    if (!attribute.key || !attribute.label) {
      throw new Error('Each custom attribute requires a key and a label');
    }
    if (seenKeys.has(attribute.key)) {
      throw new Error(`Duplicate custom attribute key: ${attribute.key}`);
    }
    seenKeys.add(attribute.key);

    if (attribute.type !== 'number' && attribute.type !== 'text') {
      throw new Error(
        `Unknown custom attribute type for "${attribute.key}": ${String(attribute.type)}`,
      );
    }
    const defaultType = typeof attribute.default;
    if (attribute.type === 'number' && defaultType !== 'number') {
      throw new Error(
        `Custom attribute "${attribute.key}" declares type "number" but its default is not a number`,
      );
    }
    if (attribute.type === 'text' && defaultType !== 'string') {
      throw new Error(
        `Custom attribute "${attribute.key}" declares type "text" but its default is not a string`,
      );
    }
  }
}
