import { AdminSessionView } from '../domain/admin-session';

const BASE_URL = '/api';

async function extractErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `La requete a echoue (${response.status})`;
}

/** Admin-only sessions overview client - see `AdminSessionsController` on the backend. */
export const adminSessionsApiClient = {
  async fetchAll(): Promise<AdminSessionView[]> {
    const response = await fetch(`${BASE_URL}/admin/sessions`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as AdminSessionView[];
  },
};
