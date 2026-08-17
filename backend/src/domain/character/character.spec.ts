import { CharacterSheetSchema } from './character-sheet-schema';
import { CharacterStateDelta } from './character-state-delta';
import { Character } from './character';

describe('Character', () => {
  const schema: CharacterSheetSchema = {
    baseAttributes: {
      hitPoints: { max: 20 },
      inventory: ['torch'],
    },
    customAttributes: [
      { key: 'strength', label: 'Force', type: 'number', default: 10 },
    ],
  };

  function createFromSchema(overrides: Partial<CharacterSheetSchema> = {}) {
    return Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema: { ...schema, ...overrides },
      now: new Date('2026-01-01'),
    });
  }

  describe('fromSchema', () => {
    it('initializes hitPointsCurrent to hitPointsMax', () => {
      const character = createFromSchema();

      expect(character.hitPointsMax).toBe(20);
      expect(character.hitPointsCurrent).toBe(20);
    });

    it('initializes custom attributes to their schema defaults', () => {
      const character = createFromSchema();

      expect(character.customAttributes).toEqual({ strength: 10 });
    });

    it('initializes the inventory from the schema base attributes', () => {
      const character = createFromSchema();

      expect(character.inventory).toEqual([{ name: 'torch', quantity: 1 }]);
    });

    it('rejects a blank name', () => {
      expect(() =>
        Character.fromSchema({
          id: 'char-1',
          gameSystemId: 'game-system-1',
          sessionId: 'session-1',
          ownerUserId: 'user-1',
          name: '   ',
          schema,
          now: new Date('2026-01-01'),
        }),
      ).toThrow();
    });
  });

  describe('applyDelta', () => {
    it('applies a partial delta (hit points only) without touching the inventory', () => {
      const character = createFromSchema();

      const updated = character.applyDelta(
        CharacterStateDelta.create({ hitPoints: -5 }),
      );

      expect(updated.hitPointsCurrent).toBe(15);
      expect(updated.inventory).toEqual(character.inventory);
      expect(updated.customAttributes).toEqual(character.customAttributes);
    });

    it('clips hitPointsCurrent at 0 when damage exceeds current hit points', () => {
      const character = createFromSchema();

      const updated = character.applyDelta(
        CharacterStateDelta.create({ hitPoints: -999 }),
      );

      expect(updated.hitPointsCurrent).toBe(0);
    });

    it('clips hitPointsCurrent at hitPointsMax when healing exceeds the max', () => {
      const character = createFromSchema().applyDelta(
        CharacterStateDelta.create({ hitPoints: -10 }),
      );

      const healed = character.applyDelta(
        CharacterStateDelta.create({ hitPoints: 999 }),
      );

      expect(healed.hitPointsCurrent).toBe(20);
    });

    it('adds and removes inventory items', () => {
      const character = createFromSchema();

      const updated = character.applyDelta(
        CharacterStateDelta.create({
          inventoryAdd: ['sword'],
          inventoryRemove: ['torch'],
        }),
      );

      expect(updated.inventory).toEqual([{ name: 'sword', quantity: 1 }]);
    });

    it('merges custom attribute changes without dropping untouched attributes', () => {
      const schemaWithTwoAttributes: CharacterSheetSchema = {
        ...schema,
        customAttributes: [
          ...schema.customAttributes,
          { key: 'dexterity', label: 'Dextérité', type: 'number', default: 8 },
        ],
      };
      const character = createFromSchema(schemaWithTwoAttributes);

      const updated = character.applyDelta(
        CharacterStateDelta.create({
          customAttributeChanges: { strength: 12 },
        }),
      );

      expect(updated.customAttributes).toEqual({ strength: 12, dexterity: 8 });
    });

    it('is a no-op for an empty delta: returns the same instance, no side effects', () => {
      const character = createFromSchema();

      const updated = character.applyDelta(CharacterStateDelta.create());

      expect(updated).toBe(character);
      expect(updated.updatedAt).toEqual(character.updatedAt);
    });

    it('applying the same delta twice independently from the same base state is deterministic', () => {
      const character = createFromSchema();
      const delta = CharacterStateDelta.create({
        hitPoints: -5,
        inventoryAdd: ['sword'],
        customAttributeChanges: { strength: 12 },
      });

      const first = character.applyDelta(delta);
      const second = character.applyDelta(delta);

      expect(first.hitPointsCurrent).toBe(second.hitPointsCurrent);
      expect(first.inventory).toEqual(second.inventory);
      expect(first.customAttributes).toEqual(second.customAttributes);
    });
  });
});
