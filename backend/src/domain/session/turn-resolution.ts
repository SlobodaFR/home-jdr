import { randomUUID } from 'crypto';

/**
 * One dice roll already resolved server-side for this turn (see
 * `DiceRollerPort` / `04-llm-orchestration.md`). Persisted alongside the
 * narration so the turn log can show a `dice-roll-chip` before it, per
 * `DESIGN.md`.
 */
export interface TurnResolutionDiceRoll {
  playerId: string;
  actionKey: string;
  actionLabel: string;
  formula: string;
  rolls: number[];
  total: number;
}

export interface TurnResolutionProps {
  id: string;
  sessionId: string;
  turnNumber: number;
  narrationText: string;
  /** Empty for turns with no mechanical action (pure narration, no dice). */
  diceRolls: TurnResolutionDiceRoll[];
  resolvedAt: Date;
}

export type NewTurnResolutionProps = Omit<
  TurnResolutionProps,
  'id' | 'diceRolls' | 'resolvedAt'
> & {
  id?: string;
  diceRolls?: TurnResolutionDiceRoll[];
  resolvedAt?: Date;
};

/**
 * The resolved outcome of a turn: the narration produced by
 * `SceneResolverPort.resolve()` (a placeholder concatenation in
 * `03-session-engine`, the real LLM narration from `04-llm-orchestration`
 * onward) plus any dice rolled for mechanical actions submitted that turn.
 */
export class TurnResolution {
  private readonly props: TurnResolutionProps;

  private constructor(props: TurnResolutionProps) {
    if (props.turnNumber < 1) {
      throw new Error('turnNumber must be at least 1');
    }
    this.props = { ...props, diceRolls: [...props.diceRolls] };
  }

  static create(props: NewTurnResolutionProps): TurnResolution {
    return new TurnResolution({
      ...props,
      id: props.id ?? randomUUID(),
      diceRolls: props.diceRolls ?? [],
      resolvedAt: props.resolvedAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get turnNumber(): number {
    return this.props.turnNumber;
  }

  get narrationText(): string {
    return this.props.narrationText;
  }

  get diceRolls(): TurnResolutionDiceRoll[] {
    return [...this.props.diceRolls];
  }

  get resolvedAt(): Date {
    return this.props.resolvedAt;
  }
}
