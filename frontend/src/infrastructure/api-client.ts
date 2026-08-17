import { CurrentUser } from '../domain/user';

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
};
