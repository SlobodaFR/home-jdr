import { randomUUID } from 'crypto';
import {
  CharacterStateDelta,
  CharacterStateDeltaProps,
} from './character-state-delta';

export type PendingCharacterDeltaStatus = 'pending' | 'validated' | 'rejected';

export interface PendingCharacterDeltaProps {
  id: string;
  sessionId: string;
  turnNumber: number;
  characterId: string;
  /** Plain JSON shape of a `CharacterStateDelta`, as proposed by the LLM game master. */
  deltaPayload: CharacterStateDeltaProps;
  status: PendingCharacterDeltaStatus;
  createdAt: Date;
}

export type NewPendingCharacterDeltaProps = Omit<
  PendingCharacterDeltaProps,
  'id' | 'status' | 'createdAt'
> & {
  id?: string;
  status?: PendingCharacterDeltaStatus;
  createdAt?: Date;
};

/**
 * A `CharacterStateDelta` proposed by the LLM game master for one character,
 * for one turn, awaiting explicit human validation before it is ever applied
 * to the character sheet (see `CLAUDE.md` - "Jamais d'application
 * automatique d'un delta d'état"). `ResolveSceneUseCase` persists these with
 * `status: 'pending'` and never calls `ApplyCharacterDeltaUseCase` itself -
 * only `ValidateCharacterDeltaUseCase` does, after a human clicks "Valider".
 */
export class PendingCharacterDelta {
  private readonly props: PendingCharacterDeltaProps;

  private constructor(props: PendingCharacterDeltaProps) {
    if (!props.sessionId.trim()) {
      throw new Error('sessionId is required');
    }
    if (!props.characterId.trim()) {
      throw new Error('characterId is required');
    }
    if (props.turnNumber < 1) {
      throw new Error('turnNumber must be at least 1');
    }
    this.props = props;
  }

  static create(props: NewPendingCharacterDeltaProps): PendingCharacterDelta {
    return new PendingCharacterDelta({
      ...props,
      id: props.id ?? randomUUID(),
      status: props.status ?? 'pending',
      createdAt: props.createdAt ?? new Date(),
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

  get characterId(): string {
    return this.props.characterId;
  }

  get deltaPayload(): CharacterStateDeltaProps {
    return { ...this.props.deltaPayload };
  }

  get status(): PendingCharacterDeltaStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Rebuilds the `CharacterStateDelta` VO from the stored JSON payload. */
  toDelta(): CharacterStateDelta {
    return CharacterStateDelta.create(this.props.deltaPayload);
  }

  /** `pending` -> `validated`. The caller is responsible for actually applying the delta. */
  validate(): PendingCharacterDelta {
    if (this.props.status !== 'pending') {
      throw new Error(
        `Cannot validate a delta in status "${this.props.status}"`,
      );
    }
    return new PendingCharacterDelta({ ...this.props, status: 'validated' });
  }

  /** `pending` -> `rejected`. No state change is ever applied. */
  reject(): PendingCharacterDelta {
    if (this.props.status !== 'pending') {
      throw new Error(`Cannot reject a delta in status "${this.props.status}"`);
    }
    return new PendingCharacterDelta({ ...this.props, status: 'rejected' });
  }
}
