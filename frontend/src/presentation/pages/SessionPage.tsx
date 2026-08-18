import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SessionState } from '../../domain/session';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ActionInput } from '../components/ActionInput';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { InviteCodeBadge } from '../components/InviteCodeBadge';
import { SessionStatusPill, SessionStatusVariant } from '../components/SessionStatusPill';
import { TurnLogEntry } from '../components/TurnLogEntry';

// PRD.md - "Synchro par polling (pas de WebSocket)": the front interrogates
// session state every few seconds while the screen is open (per
// tasks/03-session-engine.md - polling toutes les 3-4 secondes tant que
// status !== 'narrating' ou tant que l'ecran est ouvert - i.e. as long as
// this component is mounted).
const POLL_INTERVAL_MS = 3500;

function statusVariant(status: SessionState['session']['status']): SessionStatusVariant {
  return status === 'resolving' ? 'resolving' : 'waiting';
}

function statusLabel(state: SessionState): string {
  if (state.session.status === 'resolving') {
    return 'Le MJ résout la scène...';
  }
  if (state.session.status === 'narrating') {
    return 'Scène résolue - au tour suivant';
  }
  const submitted = state.players.filter((p) => p.hasSubmittedCurrentTurn).length;
  return `${submitted}/${state.players.length} joueurs ont soumis`;
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    if (!id) {
      return;
    }
    sessionApiClient
      .getState(id)
      .then(setState)
      .catch(() => setError('Impossible de charger la partie.'));
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id || !actionText.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await sessionApiClient.submitTurnAction(id, actionText);
      setActionText('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'envoi de l'action a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !state) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-danger">{error}</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen bg-canvas px-lg py-section">
        <p className="font-body-md text-mute">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h1 className="font-sans-ui text-heading-xl text-ink">{state.session.name}</h1>
        <InviteCodeBadge code={state.session.inviteCode} />
      </div>

      <SessionStatusPill variant={statusVariant(state.session.status)} label={statusLabel(state)} />

      <section className="flex flex-col gap-md">
        {state.recentTurns.length === 0 && (
          <p className="font-body-md text-mute">Aucun tour résolu pour le moment.</p>
        )}
        {[...state.recentTurns].reverse().map((turn) => (
          <TurnLogEntry
            key={turn.turnNumber}
            author={`Tour ${turn.turnNumber}`}
            actionText=""
            narration={turn.narrationText}
          />
        ))}
      </section>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-sm">
        <ActionInput
          value={actionText}
          onChange={(event) => setActionText(event.target.value)}
          placeholder="Que faites-vous ?"
          disabled={submitting || state.session.status === 'resolving'}
        />
        {error && <p className="font-body-md text-danger">{error}</p>}
        <ButtonPrimary
          type="submit"
          disabled={submitting || state.session.status === 'resolving' || !actionText.trim()}
        >
          Soumettre mon action
        </ButtonPrimary>
      </form>
    </main>
  );
}
