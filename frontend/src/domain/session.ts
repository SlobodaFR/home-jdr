export type SessionStatus = 'waiting_for_players' | 'resolving' | 'narrating';

export interface SessionSummary {
  id: string;
  gameSystemId: string;
  name: string;
  inviteCode: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdByUserId: string;
  charactersVisibleToOthers: boolean;
  createdAt: string;
  /** Proactive scene-setting narration, set once every player has finalized their character - `null` until then. */
  openingNarrationText: string | null;
}

/**
 * Returned by create/join now that character creation is a guided AI
 * conversation instead of an instant sheet: the caller must continue to
 * `/character-creation/:characterCreationSessionId` before they become an
 * active player of the session.
 */
export interface SessionWithCharacterCreation extends SessionSummary {
  characterCreationSessionId: string;
}

export interface SessionPlayerState {
  userId: string;
  characterId: string;
  hasSubmittedCurrentTurn: boolean;
}

export type PendingCharacterDeltaStatus = 'pending' | 'validated' | 'rejected';

export interface DiceRoll {
  playerId: string;
  actionKey: string;
  actionLabel: string;
  formula: string;
  rolls: number[];
  total: number;
}

export interface PendingCharacterDeltaView {
  id: string;
  characterId: string;
  status: PendingCharacterDeltaStatus;
  hitPoints?: number;
  inventoryAdd: string[];
  inventoryRemove: string[];
  customAttributeChanges: Record<string, number | string>;
}

export interface SessionTurnLogEntry {
  turnNumber: number;
  narrationText: string;
  diceRolls: DiceRoll[];
  pendingDeltas: PendingCharacterDeltaView[];
  resolvedAt: string;
}

export interface SessionState {
  session: SessionSummary;
  players: SessionPlayerState[];
  recentTurns: SessionTurnLogEntry[];
}

export interface SubmitTurnActionResult {
  session: SessionSummary;
  submissionId: string;
  resolved: boolean;
  narrationText: string | null;
}

/** Response of `POST /api/sessions/:id/leave` - see `LeaveSessionUseCase`. */
export interface LeaveSessionResult {
  /** True when this was the last active player: the whole session was cascade-deleted as a side effect. */
  sessionDeleted: boolean;
}
