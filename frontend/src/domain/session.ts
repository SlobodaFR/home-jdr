export type SessionStatus = 'waiting_for_players' | 'resolving' | 'narrating';

export interface SessionSummary {
  id: string;
  gameSystemId: string;
  name: string;
  inviteCode: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdByUserId: string;
  createdAt: string;
}

export interface SessionWithCharacter extends SessionSummary {
  characterId: string;
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
