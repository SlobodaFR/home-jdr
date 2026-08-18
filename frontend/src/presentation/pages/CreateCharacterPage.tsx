import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CharacterSheetSchema } from '../../domain/character';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { BackButton } from '../components/BackButton';

/**
 * TODO(01-game-catalog): once the game catalog module is merged, fetch the
 * real `GameSystem.characterSheetSchema` for `gameSystemId` (e.g.
 * `GET /api/game-systems/:id`) instead of this stub. The shape matches the
 * "Contrat d'interface" documented in tasks/02-character-sheet.md, so
 * swapping the source is a drop-in change — the rest of this screen does
 * not need to change.
 */
const DEFAULT_CHARACTER_SHEET_SCHEMA: CharacterSheetSchema = {
  baseAttributes: {
    hitPoints: { max: 20 },
    inventory: [],
  },
  customAttributes: [
    { key: 'strength', label: 'Force', type: 'number', default: 10 },
  ],
};

export function CreateCharacterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameSystemId = searchParams.get('gameSystemId') ?? '';
  const sessionId = searchParams.get('sessionId') ?? '';
  const schema = DEFAULT_CHARACTER_SHEET_SCHEMA;

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Le nom du personnage est requis.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const character = await characterApiClient.create({
        gameSystemId,
        sessionId,
        name,
        schema,
      });
      navigate(`/characters/${character.id}`);
    } catch {
      setError('La création du personnage a échoué.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section">
      <div className="flex items-center gap-md mb-xl">
        <BackButton to="/" />
        <h1 className="font-sans-ui text-heading-xl text-ink">Créer mon personnage</h1>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-lg max-w-sm"
      >
        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Nom du personnage</span>
          <input
            className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="border border-hairline rounded-md p-md flex flex-col gap-sm">
          <p className="font-heading-md text-ink">Ce personnage débutera avec :</p>
          <p className="font-body-md text-ash">
            {schema.baseAttributes.hitPoints.max} points de vie
          </p>
          {schema.baseAttributes.inventory.length > 0 && (
            <p className="font-body-md text-ash">
              Inventaire : {schema.baseAttributes.inventory.join(', ')}
            </p>
          )}
          {schema.customAttributes.length > 0 && (
            <ul className="flex flex-col gap-xxs">
              {schema.customAttributes.map((attribute) => (
                <li key={attribute.key} className="font-body-md text-ash">
                  {attribute.label} : {attribute.default}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="font-body-md text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-on-primary px-xl py-md rounded-lg font-button-md disabled:opacity-50"
        >
          Créer mon personnage
        </button>
      </form>
    </main>
  );
}
