import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSystem } from '../../domain/game-system';
import { SessionWithCharacter } from '../../domain/session';
import { apiClient } from '../../infrastructure/api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { InviteCodeBadge } from '../components/InviteCodeBadge';

/**
 * "Créer une partie": picks a JdR, names the session and the creator's
 * character, then shows the generated invite code (InviteCodeBadge) for
 * sharing before entering the session - see
 * tasks/03-session-engine.md ("Rejoindre une partie" / code d'invitation).
 */
export function CreateSessionPage() {
  const navigate = useNavigate();
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [gameSystemId, setGameSystemId] = useState('');
  const [name, setName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SessionWithCharacter | null>(null);

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
    if (!gameSystemId || !name.trim() || !characterName.trim()) {
      setError('Tous les champs sont requis.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await sessionApiClient.create({
        gameSystemId,
        name,
        characterName,
      });
      setCreated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La création de la partie a échoué.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
        <h1 className="font-sans-ui text-heading-xl text-ink">Partie créée</h1>
        <div className="flex flex-col gap-sm">
          <p className="font-sans-body text-body-md text-ash">
            Partagez ce code pour inviter d&apos;autres joueurs :
          </p>
          <InviteCodeBadge code={created.inviteCode} />
        </div>
        <ButtonPrimary onClick={() => navigate(`/sessions/${created.id}`)}>
          Aller à la partie
        </ButtonPrimary>
      </main>
    );
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

        <label className="flex flex-col gap-xs">
          <span className="font-body-strong text-ink">Nom de votre personnage</span>
          <input
            className="border border-hairline rounded-sm px-md py-sm font-body-md text-ink bg-canvas focus:border-2 focus:border-ink outline-none"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
          />
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
