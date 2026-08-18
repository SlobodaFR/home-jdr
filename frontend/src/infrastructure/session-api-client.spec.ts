import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionApiClient } from './session-api-client';

describe('sessionApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const session = {
    id: 'session-1',
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    status: 'waiting_for_players' as const,
    currentTurnNumber: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  describe('listMine', () => {
    it('fetches the caller sessions', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => [session] }),
      );

      await expect(sessionApiClient.listMine()).resolves.toEqual([session]);
    });
  });

  describe('create', () => {
    it('posts the session payload and returns the created session with characterId', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...session, characterId: 'character-1' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await sessionApiClient.create({
        gameSystemId: 'game-system-1',
        name: 'La quete du dragon',
        characterName: 'Aragorn',
      });

      expect(result.characterId).toBe('character-1');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('throws with the backend message on failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({ message: "Ce JdR n'est pas adapté aux comptes enfant." }),
        }),
      );

      await expect(
        sessionApiClient.create({
          gameSystemId: 'game-system-1',
          name: 'La quete du dragon',
          characterName: 'Aragorn',
        }),
      ).rejects.toThrow(/enfant/);
    });
  });

  describe('join', () => {
    it('posts the invite code and character name', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...session, characterId: 'character-2' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await sessionApiClient.join({
        inviteCode: 'XK4R2P',
        characterName: 'Legolas',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/join',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });

  describe('submitTurnAction', () => {
    it('posts the action text for the session', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          session,
          submissionId: 'submission-1',
          resolved: false,
          narrationText: null,
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await sessionApiClient.submitTurnAction(
        'session-1',
        "J'ouvre la porte",
      );

      expect(result.resolved).toBe(false);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/turns',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });

  describe('getState', () => {
    it('fetches the session state for polling', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ session, players: [], recentTurns: [] }),
        }),
      );

      await expect(sessionApiClient.getState('session-1')).resolves.toEqual({
        session,
        players: [],
        recentTurns: [],
      });
    });
  });
});
