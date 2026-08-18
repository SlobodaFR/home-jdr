import { useEffect, useState } from 'react';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import { BackButton } from '../components/BackButton';

/**
 * Player-facing catalog browse screen. The list returned by the API is
 * already filtered server-side (see ListGameSystemsUseCase): a `child`
 * account only ever sees game systems flagged adaptedForChildren. Creating
 * or joining a session from a chosen JdR belongs to 03-session-engine, not
 * this task.
 */
export function ChooseGamePage() {
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .fetchGameSystems()
      .then(setGameSystems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center gap-md">
        <BackButton to="/" />
        <h1 className="font-sans-ui text-heading-xl text-ink">Choisir un JdR</h1>
      </div>

      {loading && <p className="font-body-md text-mute">Chargement...</p>}
      {error && <p className="font-body-md text-danger">{error}</p>}
      {!loading && gameSystems.length === 0 && (
        <p className="font-body-md text-mute">Aucun JdR disponible pour le moment.</p>
      )}

      <ul className="flex flex-col gap-md">
        {gameSystems.map((gameSystem) => (
          <li
            key={gameSystem.id}
            className="bg-canvas border border-hairline rounded-md shadow-card p-lg flex flex-col gap-xs"
          >
            <span className="font-heading-md text-ink">{gameSystem.name}</span>
            <p className="font-body-md text-ash">{gameSystem.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
