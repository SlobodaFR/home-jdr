import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Character } from '../../domain/character';
import { GameSystem, MechanicalAction } from '../../domain/game-system';
import { DiceRoll, PendingCharacterDeltaView, SessionState } from '../../domain/session';
import { apiClient } from '../../infrastructure/api-client';
import { characterApiClient } from '../../infrastructure/character-api-client';
import { QuotaExceededClientError, sessionApiClient } from '../../infrastructure/session-api-client';
import { useAuth } from '../auth/AuthProvider';
import { ActionInput } from '../components/ActionInput';
import { BackButton } from '../components/BackButton';
import { ButtonDanger } from '../components/ButtonDanger';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { DeltaProposalCard, DeltaProposalItem } from '../components/DeltaProposalCard';
import { DiceRollChip } from '../components/DiceRollChip';
import { InviteCodeBadge } from '../components/InviteCodeBadge';
import { SessionStatusPill, SessionStatusVariant } from '../components/SessionStatusPill';
import { TurnLogEntry } from '../components/TurnLogEntry';
import { CharacterStatBar } from '../character/CharacterStatBar';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<SessionState | null>(null);
  const [gameSystem, setGameSystem] = useState<GameSystem | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionText, setActionText] = useState('');
  const [mechanicalActionKey, setMechanicalActionKey] = useState(FREE_ACTION_VALUE);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeltaAction, setPendingDeltaAction] = useState<string | null>(null);
  const [leavingOrDeleting, setLeavingOrDeleting] = useState(false);

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

  // Character list, gated server-side by charactersVisibleToOthers: the
  // caller only ever gets back what they're allowed to see (own sheet, or
  // every sheet of the session) - see ListCharactersForSessionUseCase.
  useEffect(() => {
    if (!id) {
      return;
    }
    characterApiClient
      .listBySession(id)
      .then(setCharacters)
      .catch(() => setCharacters([]));
  }, [id, state?.session.status]);

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
      // Never surface a raw technical error to the player on quota
      // exhaustion (see CLAUDE.md / tasks/08-admin-quotas-cost-guardrails.md).
      if (err instanceof QuotaExceededClientError) {
        setError('Le MJ numérique a atteint sa limite du jour, réessaie plus tard');
      } else {
        setError(err instanceof Error ? err.message : "L'envoi de l'action a échoué.");
      }
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

  async function handleDeleteSession() {
    if (!id) {
      return;
    }
    if (!window.confirm('Supprimer definitivement cette partie ? Cette action est irreversible.')) {
      return;
    }
    setLeavingOrDeleting(true);
    setError(null);
    try {
      await sessionApiClient.deleteSession(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La suppression de la partie a échoué.');
      setLeavingOrDeleting(false);
    }
  }

  async function handleLeaveSession() {
    if (!id) {
      return;
    }
    if (!window.confirm('Quitter cette partie ?')) {
      return;
    }
    setLeavingOrDeleting(true);
    setError(null);
    try {
      await sessionApiClient.leaveSession(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le fait de quitter la partie a échoué.');
      setLeavingOrDeleting(false);
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
        <div className="flex items-center gap-md">
          <BackButton to="/" />
          <h1 className="font-sans-ui text-heading-xl text-ink">{state.session.name}</h1>
        </div>
        <div className="flex items-center gap-md">
          <Link to={`/sessions/${state.session.id}/map`} className="font-sans-body text-link-md text-ink">
            Carte du monde
          </Link>
          <InviteCodeBadge code={state.session.inviteCode} />
          {state.players.length === 1 && (
            <ButtonDanger onClick={() => void handleDeleteSession()} disabled={leavingOrDeleting}>
              Supprimer la partie
            </ButtonDanger>
          )}
          {state.players.length > 1 && (
            <ButtonSecondary onClick={() => void handleLeaveSession()} disabled={leavingOrDeleting}>
              Quitter la partie
            </ButtonSecondary>
          )}
        </div>
      </div>

      <SessionStatusPill variant={statusVariant(state.session.status)} label={statusLabel(state)} />

      {characters.length > 0 && (
        <section className="flex flex-col gap-sm">
          <h2 className="font-sans-ui text-heading-md text-ink">
            {state.session.charactersVisibleToOthers ? 'Personnages de la partie' : 'Mon personnage'}
          </h2>
          <div className="flex flex-col gap-md">
            {characters.map((character) => (
              <div key={character.id} className="border-b border-hairline pb-sm flex flex-col gap-xs">
                <div className="flex items-center justify-between">
                  <span className="font-body-strong text-ink">{character.name}</span>
                  {character.ownerUserId === user?.id && (
                    <span className="font-caption-sm text-mute">Moi</span>
                  )}
                </div>
                {character.hitPointsMax > 0 && (
                  <CharacterStatBar
                    label="Points de vie"
                    current={character.hitPointsCurrent}
                    max={character.hitPointsMax}
                    compact
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {state.session.openingNarrationText && (
        <section className="flex flex-col gap-sm border border-hairline bg-parchment rounded-md px-lg py-md">
          <span className="font-sans-ui text-caption-md text-mute uppercase">Ouverture de la scène</span>
          <p className="font-sans-body text-body-md text-ink">{state.session.openingNarrationText}</p>
        </section>
      )}

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
