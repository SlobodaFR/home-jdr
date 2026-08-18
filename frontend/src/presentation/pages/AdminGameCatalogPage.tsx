import { useEffect, useState } from 'react';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import { BackButton } from '../components/BackButton';
import { CreateGameSystemForm } from '../game-catalog/CreateGameSystemForm';

export function AdminGameCatalogPage() {
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
        <h1 className="font-sans-ui text-heading-xl text-ink">Catalogue de JdR</h1>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="font-heading-lg text-ink">JdR existants</h2>
        {loading && <p className="font-body-md text-mute">Chargement...</p>}
        {error && <p className="font-body-md text-danger">{error}</p>}
        {!loading && gameSystems.length === 0 && (
          <p className="font-body-md text-mute">Aucun JdR au catalogue pour le moment.</p>
        )}
        <ul className="flex flex-col gap-md">
          {gameSystems.map((gameSystem) => (
            <li
              key={gameSystem.id}
              className="bg-canvas border border-hairline rounded-md shadow-card p-lg flex flex-col gap-xs"
            >
              <div className="flex items-center gap-sm">
                <span className="font-heading-md text-ink">{gameSystem.name}</span>
                {gameSystem.adaptedForChildren && (
                  <span className="bg-success text-on-primary rounded-sm text-caption-sm px-sm py-xxs">
                    Enfants
                  </span>
                )}
              </div>
              <p className="font-body-md text-ash">{gameSystem.description}</p>
              <p className="font-caption-sm text-mute">Règles : {gameSystem.rulesSourceFileName}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-heading-lg text-ink">Ajouter un JdR</h2>
        <CreateGameSystemForm onCreated={(created) => setGameSystems((prev) => [created, ...prev])} />
      </section>
    </main>
  );
}
