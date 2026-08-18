import { MapPin } from './map-pin';

describe('MapPin', () => {
  function createPin() {
    return MapPin.create({
      worldMapId: 'world-map-1',
      label: 'Le village de Bree',
      positionX: 0.5,
      positionY: 0.25,
      createdByUserId: 'user-1',
    });
  }

  describe('create', () => {
    it('defaults notes to an empty string and createdAt to now', () => {
      const before = new Date();

      const pin = createPin();

      expect(pin.notes).toBe('');
      expect(pin.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(pin.id).toBeTruthy();
    });

    it('rejects a blank label', () => {
      expect(() =>
        MapPin.create({
          worldMapId: 'world-map-1',
          label: '   ',
          positionX: 0.5,
          positionY: 0.5,
          createdByUserId: 'user-1',
        }),
      ).toThrow();
    });

    it.each([-0.1, 1.1])(
      'rejects a positionX out of the 0-1 range (%s)',
      (positionX) => {
        expect(() =>
          MapPin.create({
            worldMapId: 'world-map-1',
            label: 'Le village de Bree',
            positionX,
            positionY: 0.5,
            createdByUserId: 'user-1',
          }),
        ).toThrow();
      },
    );

    it.each([-0.1, 1.1])(
      'rejects a positionY out of the 0-1 range (%s)',
      (positionY) => {
        expect(() =>
          MapPin.create({
            worldMapId: 'world-map-1',
            label: 'Le village de Bree',
            positionX: 0.5,
            positionY,
            createdByUserId: 'user-1',
          }),
        ).toThrow();
      },
    );

    it('accepts boundary positions 0 and 1', () => {
      expect(() =>
        MapPin.create({
          worldMapId: 'world-map-1',
          label: 'Le village de Bree',
          positionX: 0,
          positionY: 1,
          createdByUserId: 'user-1',
        }),
      ).not.toThrow();
    });
  });

  describe('update', () => {
    it('returns a copy with the given fields replaced, keeping the same id', () => {
      const pin = createPin();

      const moved = pin.update({ positionX: 0.9, positionY: 0.1 });

      expect(moved.id).toBe(pin.id);
      expect(moved.positionX).toBe(0.9);
      expect(moved.positionY).toBe(0.1);
      expect(moved.label).toBe(pin.label);
    });

    it('rejects moving a pin out of the 0-1 range', () => {
      const pin = createPin();

      expect(() => pin.update({ positionX: 1.5 })).toThrow();
    });

    it('leaves fields untouched when their change is undefined (partial update)', () => {
      const pin = createPin();

      const renamed = pin.update({
        label: 'Bree (renomme)',
        positionX: undefined,
      });

      expect(renamed.label).toBe('Bree (renomme)');
      expect(renamed.positionX).toBe(pin.positionX);
      expect(renamed.positionY).toBe(pin.positionY);
    });
  });
});
