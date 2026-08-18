import { MapPin, WorldMap, WorldMapView } from '../domain/world-map';

const BASE_URL = '/api';

export interface AddMapPinInput {
  label: string;
  positionX: number;
  positionY: number;
  notes?: string;
}

export interface UpdateMapPinInput {
  label?: string;
  positionX?: number;
  positionY?: number;
  notes?: string;
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

export const worldMapApiClient = {
  async get(sessionId: string): Promise<WorldMapView> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/world-map`, {
      credentials: 'include',
    });
    return parseJsonOrThrow<WorldMapView>(response);
  },

  async generate(sessionId: string, description?: string): Promise<WorldMap> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/world-map`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    return parseJsonOrThrow<WorldMap>(response);
  },

  async addPin(sessionId: string, input: AddMapPinInput): Promise<MapPin> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/world-map/pins`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return parseJsonOrThrow<MapPin>(response);
  },

  async updatePin(
    sessionId: string,
    pinId: string,
    input: UpdateMapPinInput,
  ): Promise<MapPin> {
    const response = await fetch(
      `${BASE_URL}/sessions/${sessionId}/world-map/pins/${pinId}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    return parseJsonOrThrow<MapPin>(response);
  },

  async removePin(sessionId: string, pinId: string): Promise<void> {
    const response = await fetch(
      `${BASE_URL}/sessions/${sessionId}/world-map/pins/${pinId}`,
      { method: 'DELETE', credentials: 'include' },
    );
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
};
