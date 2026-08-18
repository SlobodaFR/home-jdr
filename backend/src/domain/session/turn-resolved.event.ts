export const TURN_RESOLVED_EVENT = 'session.turn-resolved';

/**
 * Emitted by `SubmitTurnActionUseCase` once a turn resolution completes.
 * In this session's turn lifecycle (`waiting_for_players` -> `resolving` ->
 * `narrating`), the moment resolution completes IS the moment every active
 * player has a pending action to submit for the next turn - so this single
 * event covers both PRD triggers ("partie passe en attente de l'action d'un
 * joueur" and "scène résolue", see `PRD.md`).
 *
 * Kept intentionally minimal (ids + name + turn number, no narration text):
 * consumers such as `06-notifications-push` must not receive narrative
 * content in this payload (see `CLAUDE.md` - push payloads can transit
 * third-party push services).
 */
export class TurnResolvedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly sessionName: string,
    public readonly turnNumber: number,
    public readonly playerUserIds: string[],
  ) {}
}
