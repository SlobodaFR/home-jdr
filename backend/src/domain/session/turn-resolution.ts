import { randomUUID } from 'crypto';

export interface TurnResolutionProps {
  id: string;
  sessionId: string;
  turnNumber: number;
  narrationText: string;
  resolvedAt: Date;
}

export type NewTurnResolutionProps = Omit<
  TurnResolutionProps,
  'id' | 'resolvedAt'
> & {
  id?: string;
  resolvedAt?: Date;
};

/**
 * The resolved outcome of a turn: the narration produced by
 * `SceneResolverPort.resolve()` (a placeholder concatenation in this task,
 * the real LLM narration once `04-llm-orchestration` swaps the adapter).
 */
export class TurnResolution {
  private readonly props: TurnResolutionProps;

  private constructor(props: TurnResolutionProps) {
    if (props.turnNumber < 1) {
      throw new Error('turnNumber must be at least 1');
    }
    this.props = props;
  }

  static create(props: NewTurnResolutionProps): TurnResolution {
    return new TurnResolution({
      ...props,
      id: props.id ?? randomUUID(),
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

  get resolvedAt(): Date {
    return this.props.resolvedAt;
  }
}
