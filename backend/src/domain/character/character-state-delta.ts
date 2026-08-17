export interface CharacterStateDeltaProps {
  hitPoints?: number;
  inventoryAdd?: string[];
  inventoryRemove?: string[];
  customAttributeChanges?: Record<string, number | string>;
}

/**
 * Value object describing a proposed change to a character's state (hit
 * points, inventory, custom attributes). Produced by the LLM game master
 * (`04-llm-orchestration`) as a "proposed" delta, and applied to a
 * `Character` only after explicit human validation (see `PRD.md` — deltas
 * proposés, validés manuellement).
 *
 * This VO only carries data and answers `isEmpty()`; the actual merge logic
 * against a `Character` lives on `Character#applyDelta` since it depends on
 * the character's current state (clipping hit points, merging inventory).
 */
export class CharacterStateDelta {
  private constructor(private readonly props: CharacterStateDeltaProps) {}

  static create(props: CharacterStateDeltaProps = {}): CharacterStateDelta {
    return new CharacterStateDelta({
      hitPoints: props.hitPoints,
      inventoryAdd: [...(props.inventoryAdd ?? [])],
      inventoryRemove: [...(props.inventoryRemove ?? [])],
      customAttributeChanges: { ...(props.customAttributeChanges ?? {}) },
    });
  }

  get hitPoints(): number | undefined {
    return this.props.hitPoints;
  }

  get inventoryAdd(): string[] {
    return [...(this.props.inventoryAdd ?? [])];
  }

  get inventoryRemove(): string[] {
    return [...(this.props.inventoryRemove ?? [])];
  }

  get customAttributeChanges(): Record<string, number | string> {
    return { ...(this.props.customAttributeChanges ?? {}) };
  }

  isEmpty(): boolean {
    return (
      this.props.hitPoints === undefined &&
      (this.props.inventoryAdd ?? []).length === 0 &&
      (this.props.inventoryRemove ?? []).length === 0 &&
      Object.keys(this.props.customAttributeChanges ?? {}).length === 0
    );
  }
}
