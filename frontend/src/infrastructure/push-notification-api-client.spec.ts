import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushNotificationApiClient } from './push-notification-api-client';

describe('pushNotificationApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVapidPublicKey', () => {
    it('fetches the VAPID public key', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ publicKey: 'test-public-key' }),
        }),
      );

      await expect(pushNotificationApiClient.getVapidPublicKey()).resolves.toBe(
        'test-public-key',
      );
    });
  });

  describe('register', () => {
    it('posts the endpoint and keys, returning the created subscription', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'subscription-1',
          endpoint: 'https://push.example.com/subscription/abc',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await pushNotificationApiClient.register(
        'https://push.example.com/subscription/abc',
        { p256dh: 'p256dh-value', auth: 'auth-value' },
      );

      expect(result.id).toBe('subscription-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/push-subscriptions',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('throws with the backend message on failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ message: 'Invalid subscription' }),
        }),
      );

      await expect(
        pushNotificationApiClient.register('endpoint', {
          p256dh: 'p',
          auth: 'a',
        }),
      ).rejects.toThrow(/Invalid subscription/);
    });
  });

  describe('unregister', () => {
    it('deletes the subscription by id', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal('fetch', fetchMock);

      await pushNotificationApiClient.unregister('subscription-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/push-subscriptions/subscription-1',
        expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
      );
    });

    it('throws with the backend message on failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ message: 'Forbidden' }),
        }),
      );

      await expect(
        pushNotificationApiClient.unregister('subscription-1'),
      ).rejects.toThrow(/Forbidden/);
    });
  });
});
