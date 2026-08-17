import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharacterSheetSchema } from '../domain/character';
import { characterApiClient } from './character-api-client';

describe('characterApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const schema: CharacterSheetSchema = {
    baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
    customAttributes: [],
  };

  const character = {
    id: 'char-1',
    gameSystemId: 'game-system-1',
    sessionId: 'session-1',
    ownerUserId: 'user-1',
    name: 'Aragorn',
    hitPointsMax: 20,
    hitPointsCurrent: 20,
    inventory: [],
    customAttributes: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  describe('create', () => {
    it('posts the character payload and returns the created character', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => character });
      vi.stubGlobal('fetch', fetchMock);

      const result = await characterApiClient.create({
        gameSystemId: 'game-system-1',
        sessionId: 'session-1',
        name: 'Aragorn',
        schema,
      });

      expect(result).toEqual(character);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/characters',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });

    it('throws when the request fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 400 }),
      );

      await expect(
        characterApiClient.create({
          gameSystemId: 'game-system-1',
          sessionId: 'session-1',
          name: '',
          schema,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('fetches a single character', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => character }),
      );

      await expect(characterApiClient.getById('char-1')).resolves.toEqual(
        character,
      );
    });
  });

  describe('listBySession', () => {
    it('fetches every character of a session', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => [character] }),
      );

      await expect(
        characterApiClient.listBySession('session-1'),
      ).resolves.toEqual([character]);
    });
  });
});
