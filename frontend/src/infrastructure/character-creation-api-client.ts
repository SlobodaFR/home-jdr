import {
  CharacterCreationSession,
  FinalizeCharacterCreationResult,
} from '../domain/character-creation';
import { QuotaExceededClientError } from './session-api-client';

const BASE_URL = '/api';

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

export const characterCreationApiClient = {
  async getById(id: string): Promise<CharacterCreationSession> {
    const response = await fetch(`${BASE_URL}/character-creation-sessions/${id}`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<CharacterCreationSession>(response);
  },

  /** Throws `QuotaExceededClientError` on HTTP 429 (daily LLM quota exhausted) - same contract as `sessionApiClient.submitTurnAction`. */
  async sendMessage(id: string, message: string): Promise<CharacterCreationSession> {
    const response = await fetch(
      `${BASE_URL}/character-creation-sessions/${id}/messages`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      },
    );
    if (response.status === 429) {
      throw new QuotaExceededClientError();
    }
    return parseJsonOrThrow<CharacterCreationSession>(response);
  },

  async finalize(id: string): Promise<FinalizeCharacterCreationResult> {
    const response = await fetch(
      `${BASE_URL}/character-creation-sessions/${id}/finalize`,
      { method: 'POST', credentials: 'include' },
    );
    return parseJsonOrThrow<FinalizeCharacterCreationResult>(response);
  },
};
