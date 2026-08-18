import { CustomAttributeType } from '../../domain/game-system';
import { CharacterSheetSchemaDraft, CustomAttributeDraft } from './character-sheet-schema-draft';

interface Props {
  value: CharacterSheetSchemaDraft;
  onChange: (value: CharacterSheetSchemaDraft) => void;
}

const inputClass =
  'w-full bg-canvas border border-hairline rounded-sm px-md py-sm font-body-md text-ink focus:outline-none focus:border-2 focus:border-ink';

/** Field-by-field editor for a JdR's character sheet schema - no raw JSON (see tasks/01-game-catalog.md). */
export function CharacterSheetSchemaEditor({ value, onChange }: Props) {
  function updateInventoryItem(index: number, item: string) {
    const items = [...value.inventoryDefaultItems];
    items[index] = item;
    onChange({ ...value, inventoryDefaultItems: items });
  }

  function removeInventoryItem(index: number) {
    onChange({
      ...value,
      inventoryDefaultItems: value.inventoryDefaultItems.filter((_, i) => i !== index),
    });
  }

  function updateAttribute(index: number, changes: Partial<CustomAttributeDraft>) {
    const attributes = [...value.customAttributes];
    attributes[index] = { ...attributes[index], ...changes };
    onChange({ ...value, customAttributes: attributes });
  }

  function removeAttribute(index: number) {
    onChange({ ...value, customAttributes: value.customAttributes.filter((_, i) => i !== index) });
  }

  return (
    <fieldset className="flex flex-col gap-lg">
      <legend className="font-heading-md text-ink mb-sm">Fiche de personnage</legend>

      <label className="flex flex-col gap-xs">
        <span className="font-body-strong text-ink">Points de vie de départ</span>
        <input
          type="number"
          min={1}
          className={inputClass}
          value={value.hitPointsDefaultMax}
          onChange={(e) => onChange({ ...value, hitPointsDefaultMax: e.target.value })}
          required
        />
      </label>

      <div className="flex flex-col gap-sm">
        <span className="font-body-strong text-ink">Inventaire de départ</span>
        {value.inventoryDefaultItems.map((item, index) => (
          <div key={index} className="flex gap-sm items-center">
            <input
              className={inputClass}
              value={item}
              onChange={(e) => updateInventoryItem(index, e.target.value)}
              placeholder="Torche"
            />
            <button
              type="button"
              onClick={() => removeInventoryItem(index)}
              className="font-caption-sm text-danger"
            >
              Retirer
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...value, inventoryDefaultItems: [...value.inventoryDefaultItems, ''] })}
          className="self-start font-button-sm text-ink underline"
        >
          + Ajouter un objet
        </button>
      </div>

      <div className="flex flex-col gap-sm">
        <span className="font-body-strong text-ink">Attributs spécifiques au JdR</span>
        {value.customAttributes.map((attribute, index) => (
          <div key={index} className="flex flex-col gap-xs border border-hairline rounded-sm p-sm">
            <div className="flex gap-sm">
              <input
                className={inputClass}
                placeholder="clé (ex: strength)"
                value={attribute.key}
                onChange={(e) => updateAttribute(index, { key: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Libellé (ex: Force)"
                value={attribute.label}
                onChange={(e) => updateAttribute(index, { label: e.target.value })}
              />
            </div>
            <div className="flex gap-sm items-center">
              <select
                className={inputClass}
                value={attribute.type}
                onChange={(e) => updateAttribute(index, { type: e.target.value as CustomAttributeType })}
              >
                <option value="number">Nombre</option>
                <option value="text">Texte</option>
              </select>
              <input
                className={inputClass}
                placeholder="Valeur par défaut"
                value={attribute.default}
                onChange={(e) => updateAttribute(index, { default: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="font-caption-sm text-danger whitespace-nowrap"
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              customAttributes: [
                ...value.customAttributes,
                { key: '', label: '', type: 'number', default: '' },
              ],
            })
          }
          className="self-start font-button-sm text-ink underline"
        >
          + Ajouter un attribut
        </button>
      </div>
    </fieldset>
  );
}
