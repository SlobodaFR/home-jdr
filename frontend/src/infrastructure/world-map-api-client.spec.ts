import { afterEach, describe, expect, it, vi } from 'vitest';
import { worldMapApiClient } from './world-map-api-client';

describe('worldMapApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const worldMap = {
    id: 'world-map-1',
    sessionId: 'session-1',
    imageUrl: 'https://minio.example.com/bucket/world-maps/session-1/map.png',
    generationPrompt: 'Carte du monde pour "La quete du dragon"',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const pin = {
    id: 'pin-1',
    worldMapId: 'world-map-1',
    label: 'Le village de Bree',
    positionX: 0.4,
    positionY: 0.6,
    notes: '',
    createdByUserId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  describe('get', () => {
    it('fetches the world map and its pins for a session', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ worldMap, pins: [pin] }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(worldMapApiClient.get('session-1')).resolves.toEqual({
        worldMap,
        pins: [pin],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/world-map',
        expect.objectContaining({ credentials: 'include' }),
      );
    });
  });

  describe('generate', () => {
    it('posts an optional description and returns the generated map', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => worldMap });
      vi.stubGlobal('fetch', fetchMock);

      const result = await worldMapApiClient.generate('session-1', 'Avec une foret hantee');

      expect(result).toEqual(worldMap);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/world-map',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ description: 'Avec une foret hantee' }),
        }),
      );
    });

    it('throws when the request fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) }),
      );

      await expect(worldMapApiClient.generate('session-1')).rejects.toThrow('Forbidden');
    });
  });

  describe('addPin', () => {
    it('posts the pin payload', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => pin });
      vi.stubGlobal('fetch', fetchMock);

      const result = await worldMapApiClient.addPin('session-1', {
        label: 'Le village de Bree',
        positionX: 0.4,
        positionY: 0.6,
      });

      expect(result).toEqual(pin);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/world-map/pins',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });

  describe('updatePin', () => {
    it('patches the pin with a new relative position', async () => {
      const moved = { ...pin, positionX: 0.9, positionY: 0.1 };
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => moved });
      vi.stubGlobal('fetch', fetchMock);

      const result = await worldMapApiClient.updatePin('session-1', 'pin-1', {
        positionX: 0.9,
        positionY: 0.1,
      });

      expect(result).toEqual(moved);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/world-map/pins/pin-1',
        expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
      );
    });
  });

  describe('removePin', () => {
    it('deletes the pin', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ deleted: true }) });
      vi.stubGlobal('fetch', fetchMock);

      await worldMapApiClient.removePin('session-1', 'pin-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sessions/session-1/world-map/pins/pin-1',
        expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
      );
    });
  });
});
