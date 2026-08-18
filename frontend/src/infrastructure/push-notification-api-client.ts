import { PushSubscriptionKeys, PushSubscriptionRecord } from '../domain/push-notification';

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

export const pushNotificationApiClient = {
  async getVapidPublicKey(): Promise<string | null> {
    const response = await fetch(`${BASE_URL}/push-subscriptions/vapid-public-key`, {
      credentials: 'include',
    });
    const body = await parseJsonOrThrow<{ publicKey: string | null }>(response);
    return body.publicKey;
  },

  async register(
    endpoint: string,
    keys: PushSubscriptionKeys,
  ): Promise<PushSubscriptionRecord> {
    const response = await fetch(`${BASE_URL}/push-subscriptions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, keys }),
    });
    return parseJsonOrThrow<PushSubscriptionRecord>(response);
  },

  async unregister(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/push-subscriptions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
};
