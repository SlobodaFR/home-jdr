import { randomUUID } from 'crypto';

export type SessionStatus = 'waiting_for_players' | 'resolving' | 'narrating';

export interface GameSessionProps {
  id: string;
  gameSystemId: string;
  name: string;
  inviteCode: string;
  status: SessionStatus;
  currentTurnNumber: number;
  rollingSummary: string;
  createdByUserId: string;
  createdAt: Date;
}

export type NewGameSessionProps = Omit<
  GameSessionProps,
  'id' | 'status' | 'currentTurnNumber' | 'rollingSummary' | 'createdAt'
> & {
  id?: string;
  status?: SessionStatus;
  currentTurnNumber?: number;
  rollingSummary?: string;
  createdAt?: Date;
};

/**
 * A "partie" (game session): a multi-player run of a `GameSystem`. Turn
 * lifecycle, per `PRD.md` - "Tour de jeu = soumission groupée":
 *
 *   waiting_for_players -> resolving -> narrating -> (next submission) -> waiting_for_players
 *
 * Solo is not a separate code path: a 1-player session resolves as soon as
 * its only player submits (see `SubmitTurnActionUseCase`).
 */
export class GameSession {
  private readonly props: GameSessionProps;

  private constructor(props: GameSessionProps) {
    const name = props.name.trim();
    if (!name) {
      throw new Error('GameSession name is required');
    }
    if (!props.inviteCode.trim()) {
      throw new Error('GameSession inviteCode is required');
    }
    if (props.currentTurnNumber < 1) {
      throw new Error('currentTurnNumber must be at least 1');
    }
    this.props = { ...props, name };
  }

  static create(props: NewGameSessionProps): GameSession {
    return new GameSession({
      ...props,
      id: props.id ?? randomUUID(),
      status: props.status ?? 'waiting_for_players',
      currentTurnNumber: props.currentTurnNumber ?? 1,
      rollingSummary: props.rollingSummary ?? '',
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get gameSystemId(): string {
    return this.props.gameSystemId;
  }

  get name(): string {
    return this.props.name;
  }

  get inviteCode(): string {
    return this.props.inviteCode;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get currentTurnNumber(): number {
    return this.props.currentTurnNumber;
  }

  /** Filled by `04-llm-orchestration` (periodic summary). Stub (empty) here. */
  get rollingSummary(): string {
    return this.props.rollingSummary;
  }

  get createdByUserId(): string {
    return this.props.createdByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** `waiting_for_players` -> `resolving`, once every active player has submitted. */
  beginResolving(): GameSession {
    if (this.props.status !== 'waiting_for_players') {
      throw new Error(
        `Cannot begin resolving a session in status "${this.props.status}"`,
      );
    }
    return new GameSession({ ...this.props, status: 'resolving' });
  }

  /** `resolving` -> `narrating`, once `SceneResolverPort.resolve()` has returned. */
  completeResolution(): GameSession {
    if (this.props.status !== 'resolving') {
      throw new Error(
        `Cannot complete resolution for a session in status "${this.props.status}"`,
      );
    }
    return new GameSession({ ...this.props, status: 'narrating' });
  }

  /** `narrating` -> `waiting_for_players`, opening the next turn. */
  startNextTurn(): GameSession {
    if (this.props.status !== 'narrating') {
      throw new Error(
        `Cannot start the next turn for a session in status "${this.props.status}"`,
      );
    }
    return new GameSession({
      ...this.props,
      status: 'waiting_for_players',
      currentTurnNumber: this.props.currentTurnNumber + 1,
    });
  }
}
