import {
  PendingCharacterDeltaView,
  SessionState,
  SessionSummary,
  SessionWithCharacterCreation,
  SubmitTurnActionResult,
} from '../domain/session';

const BASE_URL = '/api';

export interface CreateSessionInput {
  gameSystemId: string;
  name: string;
  charactersVisibleToOthers: boolean;
}

export interface JoinSessionInput {
  inviteCode: string;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  const message = body?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return message ?? `La requete a echoue (${response.status})`;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return (await response.json()) as T;
}

/**
 * Thrown when a turn submission fails with HTTP 429 (daily LLM quota
 * exhausted - see `QuotaExceededFilter` on the backend). Deliberately
 * carries no server-provided message: `SessionPage.tsx` always shows its
 * own curated, non-technical copy on this error (see
 * `tasks/08-admin-quotas-cost-guardrails.md` - "jamais d'erreur technique
 * brute affichée au joueur").
 */
export class QuotaExceededClientError extends Error {
  constructor() {
    super('Daily LLM quota exceeded');
    this.name = 'QuotaExceededClientError';
  }
}

export const sessionApiClient = {
  async listMine(): Promise<SessionSummary[]> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<SessionSummary[]>(response);
  },

  async create(input: CreateSessionInput): Promise<SessionWithCharacterCreation> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<SessionWithCharacterCreation>(response);
  },

  async join(input: JoinSessionInput): Promise<SessionWithCharacterCreation> {
    const response = await fetch(`${BASE_URL}/sessions/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<SessionWithCharacterCreation>(response);
  },

  async submitTurnAction(
    sessionId: string,
    actionText: string,
    mechanicalActionKey?: string,
  ): Promise<SubmitTurnActionResult> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/turns`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionText, mechanicalActionKey }),
    });
    if (response.status === 429) {
      throw new QuotaExceededClientError();
    }
    return parseJsonOrThrow<SubmitTurnActionResult>(response);
  },

  async getState(sessionId: string): Promise<SessionState> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/state`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<SessionState>(response);
  },

  async validateDelta(
    sessionId: string,
    turnNumber: number,
    deltaId: string,
  ): Promise<PendingCharacterDeltaView> {
    const response = await fetch(
      `${BASE_URL}/sessions/${sessionId}/turns/${turnNumber}/deltas/${deltaId}/validate`,
      { method: 'POST', credentials: 'include' },
    );
    return parseJsonOrThrow<PendingCharacterDeltaView>(response);
  },

  async rejectDelta(
    sessionId: string,
    turnNumber: number,
    deltaId: string,
  ): Promise<PendingCharacterDeltaView> {
    const response = await fetch(
      `${BASE_URL}/sessions/${sessionId}/turns/${turnNumber}/deltas/${deltaId}/reject`,
      { method: 'POST', credentials: 'include' },
    );
    return parseJsonOrThrow<PendingCharacterDeltaView>(response);
  },
};
