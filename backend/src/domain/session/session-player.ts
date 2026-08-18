export interface SessionPlayerProps {
  sessionId: string;
  userId: string;
  characterId: string;
  joinedAt: Date;
}

export type NewSessionPlayerProps = Omit<SessionPlayerProps, 'joinedAt'> & {
  joinedAt?: Date;
};

/**
 * Join table between a `GameSession`, a home-auth user and the `Character`
 * they play in that session. Every `SessionPlayer` row of a session is
 * considered "active" - there is no leave/kick flow in this task, see
 * `tasks/03-session-engine.md` (hors perimetre).
 */
export class SessionPlayer {
  private readonly props: SessionPlayerProps;

  private constructor(props: SessionPlayerProps) {
    if (!props.sessionId.trim()) {
      throw new Error('sessionId is required');
    }
    if (!props.userId.trim()) {
      throw new Error('userId is required');
    }
    if (!props.characterId.trim()) {
      throw new Error('characterId is required');
    }
    this.props = props;
  }

  static create(props: NewSessionPlayerProps): SessionPlayer {
    return new SessionPlayer({
      ...props,
      joinedAt: props.joinedAt ?? new Date(),
    });
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get characterId(): string {
    return this.props.characterId;
  }

  get joinedAt(): Date {
    return this.props.joinedAt;
  }
}
