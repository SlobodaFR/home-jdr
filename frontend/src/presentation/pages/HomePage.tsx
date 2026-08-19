import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { GameSystem } from '../../domain/game-system';
import { SessionSummary, SessionStatus } from '../../domain/session';
import { apiClient } from '../../infrastructure/api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { GameCard } from '../components/GameCard';
import { SessionStatusPill, SessionStatusVariant } from '../components/SessionStatusPill';
import { AppHeader } from '../layout/AppHeader';
import { AppShell } from '../layout/AppShell';
import { ErrorBanner } from '../layout/ErrorBanner';
import { useAppNavItems } from '../layout/useAppNavItems';
import { NotificationOnboardingBanner } from '../notifications/NotificationOnboardingBanner';

function statusVariant(status: SessionStatus): SessionStatusVariant {
  return status === 'resolving' ? 'resolving' : 'waiting';
}

function statusLabel(status: SessionStatus): string {
  if (status === 'resolving') {
    return 'Le MJ résout la scène...';
  }
  if (status === 'narrating') {
    return 'Scène résolue';
  }
  return 'En attente des joueurs';
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const navItems = useAppNavItems();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [gameSystems, setGameSystems] = useState<GameSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([sessionApiClient.listMine(), apiClient.fetchGameSystems()])
      .then(([mySessions, systems]) => {
        setSessions(mySessions);
        setGameSystems(systems);
      })
      .catch(() => setError('Impossible de charger vos parties.'))
      .finally(() => setLoading(false));
  }, []);

  function gameNameFor(gameSystemId: string): string {
    return gameSystems.find((system) => system.id === gameSystemId)?.name ?? gameSystemId;
  }

  return (
    <AppShell navItems={navItems} header={<AppHeader />}>
      <div className="flex flex-col gap-xl">
        <div>
          <h1 className="font-sans-ui text-heading-xl text-ink">Mes parties</h1>
          {user && <p className="font-sans-body text-body-md text-ash mt-xxs">Bonjour, {user.name}.</p>}
        </div>

        <NotificationOnboardingBanner />

        <div className="flex gap-md flex-wrap">
          <ButtonPrimary onClick={() => navigate('/sessions/new')}>Créer une partie</ButtonPrimary>
          <ButtonSecondary onClick={() => navigate('/sessions/join')}>
            Rejoindre une partie
          </ButtonSecondary>
        </div>

        {error && <ErrorBanner message={error} />}
        {loading && <p className="font-sans-body text-body-md text-mute">Chargement...</p>}

        {!loading && sessions.length === 0 && !error && (
          <p className="font-sans-body text-body-md text-mute">
            Aucune partie pour le moment. Créez-en une ou rejoignez-en une avec un code.
          </p>
        )}

        {sessions.length > 0 && (
          <section className="flex flex-col gap-md">
            <h2 className="font-sans-ui text-heading-md text-ink">
              Parties en cours ({sessions.length})
            </h2>
            <div className="grid grid-cols-1 desktop:grid-cols-2 gap-md">
              {sessions.map((session) => (
                <GameCard
                  key={session.id}
                  gameName={gameNameFor(session.gameSystemId)}
                  sessionName={session.name}
                  lastActivityLabel={`Tour ${session.currentTurnNumber}`}
                  statusSlot={
                    <SessionStatusPill
                      variant={statusVariant(session.status)}
                      label={statusLabel(session.status)}
                    />
                  }
                  onClick={() => navigate(`/sessions/${session.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
