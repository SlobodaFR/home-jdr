import { CharacterSheetSchema } from './character-sheet-schema';
import { CharacterStateDelta } from './character-state-delta';

export interface InventoryItem {
  name: string;
  quantity: number;
}

export interface CharacterProps {
  id: string;
  gameSystemId: string;
  /**
   * Plain string id, no FK relation: the `Session`/`GameParty` entity does
   * not exist yet (built in `03-session-engine`, in parallel).
   */
  sessionId: string;
  ownerUserId: string;
  name: string;
  hitPointsMax: number;
  hitPointsCurrent: number;
  inventory: InventoryItem[];
  customAttributes: Record<string, number | string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacterFromSchemaProps {
  id: string;
  gameSystemId: string;
  sessionId: string;
  ownerUserId: string;
  name: string;
  schema: CharacterSheetSchema;
  now: Date;
}

function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function applyInventoryChanges(
  inventory: InventoryItem[],
  add: string[],
  remove: string[],
): InventoryItem[] {
  if (add.length === 0 && remove.length === 0) {
    return inventory;
  }

  const quantities = new Map(
    inventory.map((item) => [item.name, item.quantity]),
  );

  for (const name of add) {
    quantities.set(name, (quantities.get(name) ?? 0) + 1);
  }

  for (const name of remove) {
    const current = quantities.get(name);
    if (current === undefined) {
      continue;
    }
    if (current <= 1) {
      quantities.delete(name);
    } else {
      quantities.set(name, current - 1);
    }
  }

  return Array.from(quantities.entries()).map(([name, quantity]) => ({
    name,
    quantity,
  }));
}

/**
 * A player character sheet: base attributes (hit points, inventory)
 * initialized from a `GameSystem.characterSheetSchema`, plus custom
 * attributes defined by that same schema. See `PRD.md` — "1 personnage = 1
 * partie" (no reuse of a character across sessions).
 */
export class Character {
  private readonly props: CharacterProps;

  private constructor(props: CharacterProps) {
    const name = props.name.trim();
    if (!name) {
      throw new Error('Character name is required');
    }
    if (props.hitPointsMax <= 0) {
      throw new Error('hitPointsMax must be strictly positive');
    }

    this.props = {
      ...props,
      name,
      hitPointsCurrent: clip(props.hitPointsCurrent, 0, props.hitPointsMax),
      inventory: [...props.inventory],
      customAttributes: { ...props.customAttributes },
    };
  }

  static create(props: CharacterProps): Character {
    return new Character(props);
  }

  /** Initializes a new character sheet from a `GameSystem` schema. */
  static fromSchema(input: CreateCharacterFromSchemaProps): Character {
    const hitPointsMax = input.schema.baseAttributes.hitPoints.max;
    const inventory: InventoryItem[] =
      input.schema.baseAttributes.inventory.map((name) => ({
        name,
        quantity: 1,
      }));
    const customAttributes = Object.fromEntries(
      input.schema.customAttributes.map((attribute) => [
        attribute.key,
        attribute.default,
      ]),
    );

    return new Character({
      id: input.id,
      gameSystemId: input.gameSystemId,
      sessionId: input.sessionId,
      ownerUserId: input.ownerUserId,
      name: input.name,
      hitPointsMax,
      hitPointsCurrent: hitPointsMax,
      inventory,
      customAttributes,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get gameSystemId(): string {
    return this.props.gameSystemId;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get name(): string {
    return this.props.name;
  }

  get hitPointsMax(): number {
    return this.props.hitPointsMax;
  }

  get hitPointsCurrent(): number {
    return this.props.hitPointsCurrent;
  }

  get inventory(): InventoryItem[] {
    return [...this.props.inventory];
  }

  get customAttributes(): Record<string, number | string> {
    return { ...this.props.customAttributes };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Applies an already-validated `CharacterStateDelta`. No business
   * validation of "is this delta reasonable" happens here — that is the
   * responsibility of the human (UI/MJ) who validated it upstream (see
   * `PRD.md` — deltas proposés, validés manuellement).
   *
   * - `hitPointsCurrent` is always clipped between 0 and `hitPointsMax`.
   * - An empty delta is a pure no-op: the same `Character` instance is
   *   returned, no new object, no `updatedAt` change.
   */
  applyDelta(delta: CharacterStateDelta): Character {
    if (delta.isEmpty()) {
      return this;
    }

    const hitPointsCurrent = clip(
      this.props.hitPointsCurrent + (delta.hitPoints ?? 0),
      0,
      this.props.hitPointsMax,
    );
    const inventory = applyInventoryChanges(
      this.props.inventory,
      delta.inventoryAdd,
      delta.inventoryRemove,
    );
    const customAttributes = {
      ...this.props.customAttributes,
      ...delta.customAttributeChanges,
    };

    return new Character({
      ...this.props,
      hitPointsCurrent,
      inventory,
      customAttributes,
      updatedAt: new Date(),
    });
  }
}
