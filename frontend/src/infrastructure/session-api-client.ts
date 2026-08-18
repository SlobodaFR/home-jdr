import {
  SessionState,
  SessionSummary,
  SessionWithCharacter,
  SubmitTurnActionResult,
} from '../domain/session';

const BASE_URL = '/api';

export interface CreateSessionInput {
  gameSystemId: string;
  name: string;
  characterName: string;
}

export interface JoinSessionInput {
  inviteCode: string;
  characterName: string;
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

export const sessionApiClient = {
  async listMine(): Promise<SessionSummary[]> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<SessionSummary[]>(response);
  },

  async create(input: CreateSessionInput): Promise<SessionWithCharacter> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<SessionWithCharacter>(response);
  },

  async join(input: JoinSessionInput): Promise<SessionWithCharacter> {
    const response = await fetch(`${BASE_URL}/sessions/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<SessionWithCharacter>(response);
  },

  async submitTurnAction(
    sessionId: string,
    actionText: string,
  ): Promise<SubmitTurnActionResult> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/turns`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionText }),
    });
    return parseJsonOrThrow<SubmitTurnActionResult>(response);
  },

  async getState(sessionId: string): Promise<SessionState> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/state`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<SessionState>(response);
  },
};
