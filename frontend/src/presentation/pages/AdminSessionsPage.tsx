import { useEffect, useState } from 'react';
import { AdminSessionView } from '../../domain/admin-session';
import { SessionStatus } from '../../domain/session';
import { adminSessionsApiClient } from '../../infrastructure/admin-sessions-api-client';
import { BackButton } from '../components/BackButton';
import { SessionStatusPill, SessionStatusVariant } from '../components/SessionStatusPill';

function statusVariant(status: SessionStatus): SessionStatusVariant {
  return status === 'resolving' ? 'resolving' : 'waiting';
}

function statusLabel(status: SessionStatus): string {
  if (status === 'resolving') {
    return 'Resolution en cours';
  }
  if (status === 'narrating') {
    return 'Scene resolue';
  }
  return 'En attente des joueurs';
}

/** Admin-only overview of every session in the system - mirrors AdminGameCatalogPage/AdminUsagePage. */
export function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminSessionsApiClient
      .fetchAll()
      .then(setSessions)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center gap-md">
        <BackButton to="/" />
        <h1 className="font-sans-ui text-heading-xl text-ink">Parties</h1>
      </div>

      {loading && <p className="font-body-md text-mute">Chargement...</p>}
      {error && <p className="font-body-md text-danger">{error}</p>}
      {!loading && sessions.length === 0 && (
        <p className="font-body-md text-mute">Aucune partie pour le moment.</p>
      )}

      <ul className="flex flex-col gap-md">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="bg-canvas border border-hairline rounded-md shadow-card p-lg flex flex-col gap-sm"
          >
            <div className="flex items-center justify-between gap-sm flex-wrap">
              <span className="font-heading-md text-ink">{session.name}</span>
              <SessionStatusPill
                variant={statusVariant(session.status)}
                label={statusLabel(session.status)}
              />
            </div>
            <p className="font-body-md text-ash">{session.gameSystemName}</p>
            <p className="font-caption-sm text-mute">
              Tour {session.currentTurnNumber} - creee le{' '}
              {new Date(session.createdAt).toLocaleDateString('fr-FR')}
            </p>
            <div className="flex flex-col gap-xxs">
              <span className="font-caption-sm text-mute">Participants :</span>
              {session.participants.length === 0 ? (
                <span className="font-caption-sm text-mute">Aucun joueur actif.</span>
              ) : (
                <ul className="flex flex-col gap-xxs">
                  {session.participants.map((participant) => (
                    <li
                      key={`${session.id}-${participant.userId}`}
                      className="font-body-md text-ink"
                    >
                      {participant.characterName}{' '}
                      <span className="font-caption-sm text-mute">({participant.userId})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
