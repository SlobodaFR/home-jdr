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

/** Mirrors `backend/src/interfaces/http/controllers/character-creation.controller.ts`'s response shape. */
export interface CharacterCreationSession {
  id: string;
  gameSessionId: string;
  gameSystemId: string;
  userId: string;
  status: CharacterCreationStatus;
  messages: CharacterCreationMessage[];
  draftCharacter: CharacterCreationDraft;
  createdAt: string;
  updatedAt: string;
}

export interface FinalizeCharacterCreationResult {
  character: {
    id: string;
    gameSystemId: string;
    sessionId: string;
    ownerUserId: string;
    name: string;
    hitPointsMax: number;
    hitPointsCurrent: number;
    inventory: { name: string; quantity: number }[];
    customAttributes: Record<string, number | string>;
    createdAt: string;
    updatedAt: string;
  };
  sessionPlayer: {
    sessionId: string;
    userId: string;
    characterId: string;
    joinedAt: string;
  };
}
