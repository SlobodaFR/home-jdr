import { WorldMap } from './world-map';

describe('WorldMap', () => {
  function createWorldMap() {
    return WorldMap.create({
      sessionId: 'session-1',
      imageStorageKey: 'world-maps/session-1/map.png',
      generationPrompt: 'Carte du monde pour "La quete du dragon"',
    });
  }

  describe('create', () => {
    it('defaults createdAt to now and generates an id', () => {
      const before = new Date();

      const worldMap = createWorldMap();

      expect(worldMap.id).toBeTruthy();
      expect(worldMap.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('rejects a blank sessionId', () => {
      expect(() =>
        WorldMap.create({
          sessionId: '   ',
          imageStorageKey: 'world-maps/session-1/map.png',
          generationPrompt: 'Carte du monde',
        }),
      ).toThrow();
    });

    it('rejects a blank imageStorageKey', () => {
      expect(() =>
        WorldMap.create({
          sessionId: 'session-1',
          imageStorageKey: '   ',
          generationPrompt: 'Carte du monde',
        }),
      ).toThrow();
    });
  });
});
