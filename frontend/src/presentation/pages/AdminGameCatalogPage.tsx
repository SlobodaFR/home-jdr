import { useEffect, useState } from 'react';
import { GameSystem } from '../../domain/game-system';
import { apiClient } from '../../infrastructure/api-client';
import { AdminBadgeChildren } from '../components/AdminBadgeChildren';
import { BackButton } from '../components/BackButton';
import { ButtonDanger } from '../components/ButtonDanger';
import { CreateGameSystemForm } from '../game-catalog/CreateGameSystemForm';
import { AppHeader } from '../layout/AppHeader';
import { AppShell } from '../layout/AppShell';
import { ErrorBanner } from '../layout/ErrorBanner';
import { useAppNavItems } from '../layout/useAppNavItems';

export function AdminGameCatalogPage() {
  const navItems = useAppNavItems();
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .fetchGameSystems()
      .then(setGameSystems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(gameSystem: GameSystem) {
    if (!window.confirm(`Supprimer definitivement "${gameSystem.name}" ?`)) {
      return;
    }

    setDeleteError(null);
    setDeletingId(gameSystem.id);
    try {
      await apiClient.deleteGameSystem(gameSystem.id);
      setGameSystems((prev) => prev.filter((existing) => existing.id !== gameSystem.id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'La suppression a echoue.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AppShell navItems={navItems} header={<AppHeader />}>
      <div className="flex flex-col gap-xl">
        <div className="flex items-center gap-md">
          <BackButton to="/" />
          <h1 className="font-sans-ui text-heading-xl text-ink">Catalogue de JdR</h1>
        </div>

        <section className="flex flex-col gap-md">
          <h2 className="font-sans-ui text-heading-lg text-ink">
            JdR existants{!loading && gameSystems.length > 0 ? ` (${gameSystems.length})` : ''}
          </h2>
          {loading && <p className="font-sans-body text-body-md text-mute">Chargement...</p>}
          {error && <ErrorBanner message={error} />}
          {deleteError && <ErrorBanner message={deleteError} />}
          {!loading && gameSystems.length === 0 && (
            <p className="font-sans-body text-body-md text-mute">Aucun JdR au catalogue pour le moment.</p>
          )}
          <ul className="grid grid-cols-1 desktop:grid-cols-2 gap-md">
            {gameSystems.map((gameSystem) => (
              <li
                key={gameSystem.id}
                className="bg-canvas border border-hairline rounded-md shadow-card p-lg flex flex-col gap-sm transition-colors hover:border-ink"
              >
                <div className="flex items-start justify-between gap-sm flex-wrap">
                  <span className="font-sans-ui text-heading-md text-ink flex items-center gap-sm flex-wrap">
                    {gameSystem.name}
                    {gameSystem.adaptedForChildren && <AdminBadgeChildren />}
                  </span>
                  <ButtonDanger
                    onClick={() => void handleDelete(gameSystem)}
                    disabled={deletingId === gameSystem.id}
                  >
                    {deletingId === gameSystem.id ? 'Suppression...' : 'Supprimer'}
                  </ButtonDanger>
                </div>
                <p className="font-sans-body text-body-md text-ash line-clamp-2">{gameSystem.description}</p>
                <p className="font-sans-body text-caption-sm text-mute flex items-center gap-xs mt-auto pt-xs border-t border-hairline">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 2.5h7l3 3V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V3a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
                    <path d="M12 2.5V6h3" strokeLinejoin="round" />
                  </svg>
                  Règles : {gameSystem.rulesSourceFileName}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="font-sans-ui text-heading-lg text-ink">Ajouter un JdR</h2>
          <CreateGameSystemForm onCreated={(created) => setGameSystems((prev) => [created, ...prev])} />
        </section>
      </div>
    </AppShell>
  );
}
