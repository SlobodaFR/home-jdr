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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h1 className="font-sans-ui text-heading-xl text-ink">Mes parties</h1>
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate('/settings/notifications')}
            className="border border-hairline text-ink px-lg py-sm rounded-lg font-button-sm"
          >
            Notifications
          </button>
          <button
            onClick={() => void logout()}
            className="border border-hairline text-ink px-lg py-sm rounded-lg font-button-sm"
          >
            Se déconnecter
          </button>
        </div>
      </div>
      <p className="font-body-md text-ash">Connecté en tant que {user?.name}.</p>

      <NotificationOnboardingBanner />

      <div className="flex gap-md flex-wrap">
        <ButtonPrimary onClick={() => navigate('/sessions/new')}>Créer une partie</ButtonPrimary>
        <ButtonSecondary onClick={() => navigate('/sessions/join')}>
          Rejoindre une partie
        </ButtonSecondary>
      </div>

      {loading && <p className="font-body-md text-mute">Chargement...</p>}
      {error && <p className="font-body-md text-danger">{error}</p>}
      {!loading && sessions.length === 0 && (
        <p className="font-body-md text-mute">
          Aucune partie pour le moment. Créez-en une ou rejoignez-en une avec un code.
        </p>
      )}

      <div className="flex flex-col gap-md">
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
    </main>
  );
}
