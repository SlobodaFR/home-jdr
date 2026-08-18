import { FormEvent, useState } from 'react';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import {
  CharacterSheetSchemaDraft,
  emptyCharacterSheetSchemaDraft,
  toCharacterSheetSchema,
} from './character-sheet-schema-draft';
import { CharacterSheetSchemaEditor } from './CharacterSheetSchemaEditor';
import { MechanicalActionDraft, toMechanicalActions } from './mechanical-action-draft';
import { MechanicalActionsEditor } from './MechanicalActionsEditor';

interface Props {
  onCreated: (gameSystem: GameSystem) => void;
}

const inputClass =
  'w-full bg-canvas border border-hairline rounded-sm px-md py-sm font-body-md text-ink focus:outline-none focus:border-2 focus:border-ink';

/** Admin-only form: PDF rules upload + field-by-field schema editors (see tasks/01-game-catalog.md). */
export function CreateGameSystemForm({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adaptedForChildren, setAdaptedForChildren] = useState(false);
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [characterSheetSchema, setCharacterSheetSchema] = useState<CharacterSheetSchemaDraft>(
    emptyCharacterSheetSchemaDraft(),
  );
  const [mechanicalActions, setMechanicalActions] = useState<MechanicalActionDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rulesFile) {
      setError('Le PDF de règles est obligatoire.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('adaptedForChildren', String(adaptedForChildren));
      formData.append('characterSheetSchema', JSON.stringify(toCharacterSheetSchema(characterSheetSchema)));
      formData.append('mechanicalActions', JSON.stringify(toMechanicalActions(mechanicalActions)));
      formData.append('rulesFile', rulesFile);

      const created = await apiClient.createGameSystem(formData);
      onCreated(created);

      setName('');
      setDescription('');
      setAdaptedForChildren(false);
      setRulesFile(null);
      setCharacterSheetSchema(emptyCharacterSheetSchemaDraft());
      setMechanicalActions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La création a échoué.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-xl">
      <div className="flex flex-col gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Nom du JdR</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Description</span>
          <textarea
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <label className="flex items-center gap-sm">
          <input
            type="checkbox"
            checked={adaptedForChildren}
            onChange={(e) => setAdaptedForChildren(e.target.checked)}
          />
          <span className="font-body-md text-ink">Adapté aux enfants</span>
        </label>

        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">PDF de règles</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setRulesFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
      </div>

      <CharacterSheetSchemaEditor value={characterSheetSchema} onChange={setCharacterSheetSchema} />

      <MechanicalActionsEditor value={mechanicalActions} onChange={setMechanicalActions} />

      {error && <p className="font-body-md text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start bg-ink text-on-primary px-xl py-md rounded-lg font-button-md disabled:opacity-50"
      >
        {submitting ? 'Création...' : 'Créer le JdR'}
      </button>
    </form>
  );
}
