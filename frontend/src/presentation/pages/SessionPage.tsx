import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameSystem, MechanicalAction } from '../../domain/game-system';
import { DiceRoll, PendingCharacterDeltaView, SessionState } from '../../domain/session';
import { apiClient } from '../../infrastructure/api-client';
import { sessionApiClient } from '../../infrastructure/session-api-client';
import { ActionInput } from '../components/ActionInput';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { DeltaProposalCard, DeltaProposalItem } from '../components/DeltaProposalCard';
import { DiceRollChip } from '../components/DiceRollChip';
import { InviteCodeBadge } from '../components/InviteCodeBadge';
import { SessionStatusPill, SessionStatusVariant } from '../components/SessionStatusPill';
import { TurnLogEntry } from '../components/TurnLogEntry';

// PRD.md - "Synchro par polling (pas de WebSocket)": the front interrogates
// session state every few seconds while the screen is open (per
// tasks/03-session-engine.md - polling toutes les 3-4 secondes tant que
// status !== 'narrating' ou tant que l'ecran est ouvert - i.e. as long as
// this component is mounted).
const POLL_INTERVAL_MS = 3500;

/** No mechanical action selected - a free, non-mechanical action (see tasks/04-llm-orchestration.md - "Note UX"). */
const FREE_ACTION_VALUE = '';

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

function diceRollLabel(roll: DiceRoll): string {
  return `${roll.formula} = ${roll.total}`;
}

function deltaProposalItems(delta: PendingCharacterDeltaView): DeltaProposalItem[] {
  const items: DeltaProposalItem[] = [];
  if (delta.hitPoints !== undefined) {
    items.push({
      label: 'Points de vie',
      value: delta.hitPoints > 0 ? `+${delta.hitPoints}` : `${delta.hitPoints}`,
    });
  }
  for (const item of delta.inventoryAdd) {
    items.push({ label: 'Inventaire', value: `+ ${item}` });
  }
  for (const item of delta.inventoryRemove) {
    items.push({ label: 'Inventaire', value: `- ${item}` });
  }
  for (const [key, value] of Object.entries(delta.customAttributeChanges)) {
    items.push({ label: key, value: `${value}` });
  }
  return items;
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<SessionState | null>(null);
  const [gameSystem, setGameSystem] = useState<GameSystem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [mechanicalActionKey, setMechanicalActionKey] = useState(FREE_ACTION_VALUE);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeltaAction, setPendingDeltaAction] = useState<string | null>(null);

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

  // Mechanical actions come from the session's GameSystem, loaded once the
  // session state resolves its gameSystemId (see tasks/04-llm-orchestration.md
  // - "action mécanique" dropdown, populated from GameSystem.mechanicalActions).
  useEffect(() => {
    if (!state) {
      return;
    }
    apiClient
      .fetchGameSystems()
      .then((systems) => {
        setGameSystem(systems.find((s) => s.id === state.session.gameSystemId) ?? null);
      })
      .catch(() => setGameSystem(null));
  }, [state?.session.gameSystemId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!id || !actionText.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await sessionApiClient.submitTurnAction(
        id,
        actionText,
        mechanicalActionKey === FREE_ACTION_VALUE ? undefined : mechanicalActionKey,
      );
      setActionText('');
      setMechanicalActionKey(FREE_ACTION_VALUE);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'envoi de l'action a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleValidateDelta(turnNumber: number, deltaId: string) {
    if (!id) {
      return;
    }
    setPendingDeltaAction(deltaId);
    try {
      await sessionApiClient.validateDelta(id, turnNumber, deltaId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La validation du delta a échoué.');
    } finally {
      setPendingDeltaAction(null);
    }
  }

  async function handleRejectDelta(turnNumber: number, deltaId: string) {
    if (!id) {
      return;
    }
    setPendingDeltaAction(deltaId);
    try {
      await sessionApiClient.rejectDelta(id, turnNumber, deltaId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le rejet du delta a échoué.');
    } finally {
      setPendingDeltaAction(null);
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

  const mechanicalActions: MechanicalAction[] = gameSystem?.mechanicalActions ?? [];

  return (
    <main className="min-h-screen bg-canvas px-lg py-section flex flex-col gap-xl">
      <div className="flex items-center justify-between flex-wrap gap-sm">
        <h1 className="font-sans-ui text-heading-xl text-ink">{state.session.name}</h1>
        <div className="flex items-center gap-md">
          <Link to={`/sessions/${state.session.id}/map`} className="font-sans-body text-link-md text-ink">
            Carte du monde
          </Link>
          <InviteCodeBadge code={state.session.inviteCode} />
        </div>
      </div>

      <SessionStatusPill variant={statusVariant(state.session.status)} label={statusLabel(state)} />

      <section className="flex flex-col gap-md">
        {state.recentTurns.length === 0 && (
          <p className="font-body-md text-mute">Aucun tour résolu pour le moment.</p>
        )}
        {[...state.recentTurns].reverse().map((turn) => {
          const pendingDeltas = turn.pendingDeltas.filter((delta) => delta.status === 'pending');
          return (
            <div key={turn.turnNumber} className="flex flex-col gap-md">
              <TurnLogEntry
                author={`Tour ${turn.turnNumber}`}
                actionText=""
                narration={turn.narrationText}
                diceChip={
                  turn.diceRolls.length > 0 ? (
                    <div className="flex flex-wrap gap-xs">
                      {turn.diceRolls.map((roll) => (
                        <DiceRollChip key={`${roll.playerId}-${roll.actionKey}`} label={diceRollLabel(roll)} />
                      ))}
                    </div>
                  ) : undefined
                }
              />
              {pendingDeltas.map((delta) => (
                <DeltaProposalCard
                  key={delta.id}
                  deltas={deltaProposalItems(delta)}
                  onValidate={() => void handleValidateDelta(turn.turnNumber, delta.id)}
                  onReject={() => void handleRejectDelta(turn.turnNumber, delta.id)}
                  className={pendingDeltaAction === delta.id ? 'opacity-50 pointer-events-none' : undefined}
                />
              ))}
            </div>
          );
        })}
      </section>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-sm">
        {mechanicalActions.length > 0 && (
          <label className="flex flex-col gap-xxs">
            <span className="font-sans-ui text-caption-md text-mute">Action mécanique</span>
            <select
              value={mechanicalActionKey}
              onChange={(event) => setMechanicalActionKey(event.target.value)}
              disabled={submitting || state.session.status === 'resolving'}
              className="w-full bg-canvas text-ink font-sans-body text-body-md rounded-sm border border-hairline px-md py-sm"
            >
              <option value={FREE_ACTION_VALUE}>Aucune / action libre</option>
              {mechanicalActions.map((action) => (
                <option key={action.actionKey} value={action.actionKey}>
                  {action.label}
                </option>
              ))}
            </select>
          </label>
        )}
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
