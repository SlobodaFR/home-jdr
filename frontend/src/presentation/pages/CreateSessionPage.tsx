import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';

/**
 * "Créer une partie": picks a JdR and names the session, chooses whether
 * character sheets are visible between players, then navigates to the
 * creator's guided character-creation chat - see
 * `CharacterCreationChatPage.tsx`. Character creation is no longer an
 * instant name field here: it is a guided AI conversation started once the
 * session exists (see `PRD.md` addendum).
 */
export function CreateSessionPage() {
  const navigate = useNavigate();
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [gameSystemId, setGameSystemId] = useState('');
  const [name, setName] = useState('');
  const [charactersVisibleToOthers, setCharactersVisibleToOthers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .fetchGameSystems()
      .then((systems) => {
        setGameSystems(systems);
        setGameSystemId((current) => current || (systems[0]?.id ?? ''));
      })
      .catch(() => setError('Impossible de charger le catalogue de JdR.'));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!gameSystemId || !name.trim()) {
      setError('Tous les champs sont requis.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await sessionApiClient.create({
        gameSystemId,
        name,
        charactersVisibleToOthers,
      });
      navigate(`/character-creation/${session.characterCreationSessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La création de la partie a échoué.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section">
      <h1 className="font-sans-ui text-heading-xl text-ink mb-xl">Créer une partie</h1>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-lg max-w-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">JdR</span>
          <select
            className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
            value={gameSystemId}
            onChange={(event) => setGameSystemId(event.target.value)}
          >
            {gameSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Nom de la partie</span>
          <input
            className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="flex items-center gap-sm">
          <input
            type="checkbox"
            checked={charactersVisibleToOthers}
            onChange={(event) => setCharactersVisibleToOthers(event.target.checked)}
          />
          <span className="font-body-md text-ink">Fiches visibles entre joueurs</span>
        </label>

        {error && <p className="font-body-md text-danger">{error}</p>}

        <div className="flex gap-md">
          <ButtonPrimary type="submit" disabled={submitting}>
            Créer la partie
          </ButtonPrimary>
          <ButtonSecondary type="button" onClick={() => navigate('/')}>
            Annuler
          </ButtonSecondary>
        </div>
      </form>
    </main>
  );
}
