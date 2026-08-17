import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';

describe('apiClient.fetchCurrentUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the session is not authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(apiClient.fetchCurrentUser()).resolves.toBeNull();
  });

  it('returns the current user when authenticated', async () => {
    const user = { id: 'user-1', email: 'a@b.com', name: 'A', avatarUrl: '' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) }),
    );

    await expect(apiClient.fetchCurrentUser()).resolves.toEqual(user);
  });
});
