import { CurrentUser } from '../domain/user';
import { GameSystem } from '../domain/game-system';
import { UsageStats } from '../domain/usage-stats';
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
  async fetchUsageStats(): Promise<UsageStats> {
    const response = await fetch(`${BASE_URL}/admin/usage`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as UsageStats;
  },
  async deleteGameSystem(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/game-systems/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
  async updateDailyLlmQuota(value: number): Promise<{ key: string; value: string }> {
    const response = await fetch(`${BASE_URL}/admin/settings/daily-llm-quota`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as { key: string; value: string };
  },
};
