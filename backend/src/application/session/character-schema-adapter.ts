import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { CharacterSheetSchema as GameSystemCharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';

/**
 * Bridges the two `CharacterSheetSchema` shapes that currently diverge
 * between `domain/game-system` (`01-game-catalog`, e.g.
 * `{ hitPoints: { defaultMax }, inventory: { defaultItems } }`) and
 * `domain/character` (`02-character-sheet`, e.g.
 * `{ baseAttributes: { hitPoints: { max }, inventory: [] } }`) - the same
 * pre-existing gap flagged by the TODO in
 * `frontend/src/presentation/pages/CreateCharacterPage.tsx`. Creating a
 * session or joining one both need to create the joining player's
 * `Character` from the session's `GameSystem`, so this task needs a bridge
 * to do that; converging the two schemas is out of this task's scope (owned
 * by `01-game-catalog`/`02-character-sheet`).
 */
export function toCharacterDomainSchema(
  schema: GameSystemCharacterSheetSchema,
): CharacterSheetSchema {
  return {
    baseAttributes: {
      hitPoints: { max: schema.hitPoints.defaultMax },
      inventory: [...schema.inventory.defaultItems],
    },
    customAttributes: schema.customAttributes.map((attribute) => ({
      key: attribute.key,
      label: attribute.label,
      type: attribute.type === 'text' ? 'string' : 'number',
      default: attribute.default,
    })),
  };
}
