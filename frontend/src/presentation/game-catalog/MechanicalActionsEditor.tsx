import { emptyMechanicalActionDraft, MechanicalActionDraft } from './mechanical-action-draft';

interface Props {
  value: MechanicalActionDraft[];
  onChange: (value: MechanicalActionDraft[]) => void;
}

const inputClass =
  'w-full bg-canvas border border-hairline rounded-sm px-md py-sm font-body-md text-ink focus:outline-none focus:border-2 focus:border-ink';

/**
 * Field-by-field editor for the actions that trigger a real dice roll (see
 * PRD.md - "Dés hybrides"). diceFormula is free text here; the API
 * validates it against the `1d20`/`1d20+3` pattern.
 */
export function MechanicalActionsEditor({ value, onChange }: Props) {
  function updateAction(index: number, changes: Partial<MechanicalActionDraft>) {
    const actions = [...value];
    actions[index] = { ...actions[index], ...changes };
    onChange(actions);
  }

  function removeAction(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="flex flex-col gap-sm">
      <legend className="font-heading-md text-ink mb-sm">Actions mécaniques (jets de dés)</legend>

      {value.map((action, index) => (
        <div key={index} className="flex flex-col gap-xs border border-hairline rounded-sm p-sm">
          <div className="flex gap-sm">
            <input
              className={inputClass}
              placeholder="clé (ex: melee-attack)"
              value={action.actionKey}
              onChange={(e) => updateAction(index, { actionKey: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Libellé (ex: Attaque au corps à corps)"
              value={action.label}
              onChange={(e) => updateAction(index, { label: e.target.value })}
            />
          </div>
          <div className="flex gap-sm items-center">
            <input
              className={inputClass}
              placeholder="Formule de dé (ex: 1d20)"
              value={action.diceFormula}
              onChange={(e) => updateAction(index, { diceFormula: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Stat liée (optionnel)"
              value={action.relatedStat}
              onChange={(e) => updateAction(index, { relatedStat: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeAction(index)}
              className="font-caption-sm text-danger whitespace-nowrap"
            >
              Retirer
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, emptyMechanicalActionDraft()])}
        className="self-start font-button-sm text-ink underline"
      >
        + Ajouter une action
      </button>
    </fieldset>
  );
}
