import { CharacterStateDelta } from './character-state-delta';

describe('CharacterStateDelta', () => {
  it('is empty when created with no props', () => {
    expect(CharacterStateDelta.create().isEmpty()).toBe(true);
    expect(CharacterStateDelta.create({}).isEmpty()).toBe(true);
  });

  it('is not empty when any field is set', () => {
    expect(CharacterStateDelta.create({ hitPoints: -5 }).isEmpty()).toBe(false);
    expect(
      CharacterStateDelta.create({ inventoryAdd: ['torch'] }).isEmpty(),
    ).toBe(false);
    expect(
      CharacterStateDelta.create({ inventoryRemove: ['torch'] }).isEmpty(),
    ).toBe(false);
    expect(
      CharacterStateDelta.create({
        customAttributeChanges: { strength: 12 },
      }).isEmpty(),
    ).toBe(false);
  });

  it('defaults missing collections to empty arrays/objects', () => {
    const delta = CharacterStateDelta.create({ hitPoints: -3 });

    expect(delta.inventoryAdd).toEqual([]);
    expect(delta.inventoryRemove).toEqual([]);
    expect(delta.customAttributeChanges).toEqual({});
  });

  it('is idempotent to construct: the same input always yields the same observable value', () => {
    const props = {
      hitPoints: -5,
      inventoryAdd: ['torch'],
      inventoryRemove: ['rope'],
      customAttributeChanges: { strength: 12 },
    };

    const first = CharacterStateDelta.create(props);
    const second = CharacterStateDelta.create(props);

    expect(first.hitPoints).toBe(second.hitPoints);
    expect(first.inventoryAdd).toEqual(second.inventoryAdd);
    expect(first.inventoryRemove).toEqual(second.inventoryRemove);
    expect(first.customAttributeChanges).toEqual(second.customAttributeChanges);
  });

  it('does not expose mutable references: mutating a getter result has no side effect', () => {
    const delta = CharacterStateDelta.create({
      inventoryAdd: ['torch'],
      customAttributeChanges: { strength: 12 },
    });

    delta.inventoryAdd.push('sword');
    delta.customAttributeChanges.strength = 999;

    expect(delta.inventoryAdd).toEqual(['torch']);
    expect(delta.customAttributeChanges).toEqual({ strength: 12 });
  });
});
