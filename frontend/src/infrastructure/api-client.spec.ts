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

describe('apiClient.fetchMyProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the caller profile', async () => {
    const profile = { userId: 'user-1', role: 'admin' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => profile }),
    );

    await expect(apiClient.fetchMyProfile()).resolves.toEqual(profile);
  });

  it('throws with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      }),
    );

    await expect(apiClient.fetchMyProfile()).rejects.toThrow('Unauthorized');
  });
});

describe('apiClient.fetchGameSystems', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the catalog', async () => {
    const gameSystems = [{ id: 'gs-1', name: 'JdR' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => gameSystems }),
    );

    await expect(apiClient.fetchGameSystems()).resolves.toEqual(gameSystems);
  });
});

describe('apiClient.createGameSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the given FormData and returns the created game system', async () => {
    const created = { id: 'gs-1', name: 'Donjons & Dragons' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => created });
    vi.stubGlobal('fetch', fetchMock);

    const formData = new FormData();
    formData.append('name', 'Donjons & Dragons');

    await expect(apiClient.createGameSystem(formData)).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/game-systems',
      expect.objectContaining({ method: 'POST', body: formData, credentials: 'include' }),
    );
  });

  it('throws with the server message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'rulesFile must be a PDF' }),
      }),
    );

    await expect(apiClient.createGameSystem(new FormData())).rejects.toThrow(
      'rulesFile must be a PDF',
    );
  });
});
