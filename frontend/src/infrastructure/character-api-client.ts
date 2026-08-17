import { Character, CharacterSheetSchema } from '../domain/character';

const BASE_URL = '/api';

export interface CreateCharacterInput {
  gameSystemId: string;
  sessionId: string;
  name: string;
  schema: CharacterSheetSchema;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`La requete a echoue (${response.status})`);
  }
  return (await response.json()) as T;
}

export const characterApiClient = {
  async create(input: CreateCharacterInput): Promise<Character> {
    const response = await fetch(`${BASE_URL}/characters`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<Character>(response);
  },

  async getById(id: string): Promise<Character> {
    const response = await fetch(`${BASE_URL}/characters/${id}`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<Character>(response);
  },

  async listBySession(sessionId: string): Promise<Character[]> {
    const response = await fetch(
      `${BASE_URL}/sessions/${sessionId}/characters`,
      { credentials: 'include' },
    );
    return parseJsonOrThrow<Character[]>(response);
  },
};
