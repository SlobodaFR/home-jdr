import { randomUUID } from 'crypto';

export type CharacterCreationStatus = 'in_progress' | 'completed';

export type CharacterCreationMessageRole = 'assistant' | 'user';

export interface CharacterCreationMessage {
  role: CharacterCreationMessageRole;
  content: string;
}

export interface CharacterCreationDraft {
  name?: string;
  hitPointsMax?: number;
  inventory?: string[];
  customAttributes?: Record<string, number | string>;
}

export interface CharacterCreationSessionProps {
  id: string;
  gameSessionId: string;
  gameSystemId: string;
  userId: string;
  status: CharacterCreationStatus;
  messages: CharacterCreationMessage[];
  draftCharacter: CharacterCreationDraft;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCharacterCreationSessionProps = Omit<
  CharacterCreationSessionProps,
  'id' | 'status' | 'messages' | 'draftCharacter' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  status?: CharacterCreationStatus;
  messages?: CharacterCreationMessage[];
  draftCharacter?: CharacterCreationDraft;
  createdAt?: Date;
  updatedAt?: Date;
  /**
   * Only used to seed the opening message when `messages` is not provided
   * (i.e. brand new sessions, not rehydration from storage). No LLM call is
   * ever made just to produce this greeting - see `CreateSessionUseCase` /
   * `JoinSessionUseCase` doc comments.
   */
  openingMessage?: string;
};

const DEFAULT_OPENING_MESSAGE =
  'Bienvenue ! Parle-moi du personnage que tu veux incarner.';

function mergeDraft(
  current: CharacterCreationDraft,
  updates?: Partial<CharacterCreationDraft>,
): CharacterCreationDraft {
  if (!updates) {
    return { ...current };
  }
  const merged: CharacterCreationDraft = { ...current };
  if (updates.name !== undefined) {
    merged.name = updates.name;
  }
  if (updates.hitPointsMax !== undefined) {
    merged.hitPointsMax = updates.hitPointsMax;
  }
  if (updates.inventory !== undefined) {
    merged.inventory = [...updates.inventory];
  }
  if (updates.customAttributes !== undefined) {
    merged.customAttributes = {
      ...current.customAttributes,
      ...updates.customAttributes,
    };
  }
  return merged;
}

/**
 * A guided AI conversation building up one player's `Character` sheet before
 * they become an active `SessionPlayer` of a `GameSession` (see `PRD.md`
 * addendum - "Character creation is a guided AI conversation"). Lives
 * entirely client-side of any LLM call: this entity only holds conversation
 * state and merges updates handed to it - it never calls
 * `LlmGameMasterPort` itself, that orchestration belongs to
 * `SendCharacterCreationMessageUseCase`.
 */
export class CharacterCreationSession {
  private readonly props: CharacterCreationSessionProps;

  private constructor(props: CharacterCreationSessionProps) {
    if (!props.gameSessionId.trim()) {
      throw new Error('gameSessionId is required');
    }
    if (!props.gameSystemId.trim()) {
      throw new Error('gameSystemId is required');
    }
    if (!props.userId.trim()) {
      throw new Error('userId is required');
    }
    this.props = {
      ...props,
      messages: [...props.messages],
      draftCharacter: { ...props.draftCharacter },
    };
  }

  static create(
    props: NewCharacterCreationSessionProps,
  ): CharacterCreationSession {
    const createdAt = props.createdAt ?? new Date();
    return new CharacterCreationSession({
      id: props.id ?? randomUUID(),
      gameSessionId: props.gameSessionId,
      gameSystemId: props.gameSystemId,
      userId: props.userId,
      status: props.status ?? 'in_progress',
      messages: props.messages ?? [
        {
          role: 'assistant',
          content: props.openingMessage ?? DEFAULT_OPENING_MESSAGE,
        },
      ],
      draftCharacter: props.draftCharacter ?? {},
      createdAt,
      updatedAt: props.updatedAt ?? createdAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get gameSessionId(): string {
    return this.props.gameSessionId;
  }

  get gameSystemId(): string {
    return this.props.gameSystemId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): CharacterCreationStatus {
    return this.props.status;
  }

  get messages(): CharacterCreationMessage[] {
    return [...this.props.messages];
  }

  get draftCharacter(): CharacterCreationDraft {
    return { ...this.props.draftCharacter };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Appends the player's message and the assistant's reply, and merges any
   * proposed draft updates - never destructive: a field omitted from
   * `draftUpdates` keeps its current value (see
   * `LlmGameMasterPort.assistCharacterCreation` doc comment).
   */
  appendExchange(input: {
    userMessage: string;
    assistantMessage: string;
    draftUpdates?: Partial<CharacterCreationDraft>;
    now?: Date;
  }): CharacterCreationSession {
    if (this.props.status === 'completed') {
      throw new Error(
        'Cannot append a message to a completed character creation session',
      );
    }
    return new CharacterCreationSession({
      ...this.props,
      messages: [
        ...this.props.messages,
        { role: 'user', content: input.userMessage },
        { role: 'assistant', content: input.assistantMessage },
      ],
      draftCharacter: mergeDraft(this.props.draftCharacter, input.draftUpdates),
      updatedAt: input.now ?? new Date(),
    });
  }

  /** `in_progress` -> `completed`, once `FinalizeCharacterCreationUseCase` has created the real `Character`/`SessionPlayer`. */
  complete(now?: Date): CharacterCreationSession {
    if (this.props.status === 'completed') {
      throw new Error('Character creation session is already completed');
    }
    return new CharacterCreationSession({
      ...this.props,
      status: 'completed',
      updatedAt: now ?? new Date(),
    });
  }
}
