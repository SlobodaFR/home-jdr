import { CurrentUser } from '../domain/user';
import { GameSystem } from '../domain/game-system';
import { UserProfile } from '../domain/user-profile';

const BASE_URL = '/api';

async function sendJson(path: string, method: string): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`La requete a echoue (${response.status})`);
  }
  return response;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `La requete a echoue (${response.status})`;
}

export const apiClient = {
  async fetchCurrentUser(): Promise<CurrentUser | null> {
    const response = await fetch(`${BASE_URL}/auth/me`, { credentials: 'include' });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { user: CurrentUser };
    return body.user;
  },
  async logout(): Promise<void> {
    await sendJson('/auth/logout', 'POST');
  },
  async fetchMyProfile(): Promise<UserProfile> {
    const response = await fetch(`${BASE_URL}/user-profiles/me`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as UserProfile;
  },
  async fetchGameSystems(): Promise<GameSystem[]> {
    const response = await fetch(`${BASE_URL}/game-systems`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as GameSystem[];
  },
  async createGameSystem(formData: FormData): Promise<GameSystem> {
    const response = await fetch(`${BASE_URL}/game-systems`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as GameSystem;
  },
};
