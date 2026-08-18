import { randomUUID } from 'crypto';

export interface TurnSubmissionProps {
  id: string;
  sessionId: string;
  turnNumber: number;
  playerId: string;
  actionText: string;
  /**
   * The `GameSystem.mechanicalActions[].actionKey` the player explicitly
   * picked at submission time, or undefined for a free (non-mechanical)
   * action. Explicit player choice, never LLM inference - see
   * `tasks/04-llm-orchestration.md` ("Note UX").
   */
  mechanicalActionKey?: string;
  submittedAt: Date;
}

export type NewTurnSubmissionProps = Omit<
  TurnSubmissionProps,
  'id' | 'submittedAt'
> & {
  id?: string;
  submittedAt?: Date;
};

/** One player's proposed action for a given turn of a `GameSession`. */
export class TurnSubmission {
  private readonly props: TurnSubmissionProps;

  private constructor(props: TurnSubmissionProps) {
    const actionText = props.actionText.trim();
    if (!actionText) {
      throw new Error('actionText is required');
    }
    if (props.turnNumber < 1) {
      throw new Error('turnNumber must be at least 1');
    }
    this.props = { ...props, actionText };
  }

  static create(props: NewTurnSubmissionProps): TurnSubmission {
    return new TurnSubmission({
      ...props,
      id: props.id ?? randomUUID(),
      submittedAt: props.submittedAt ?? new Date(),
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

  /** The submitting `SessionPlayer.userId`. */
  get playerId(): string {
    return this.props.playerId;
  }

  get actionText(): string {
    return this.props.actionText;
  }

  get mechanicalActionKey(): string | undefined {
    return this.props.mechanicalActionKey;
  }

  get submittedAt(): Date {
    return this.props.submittedAt;
  }
}
