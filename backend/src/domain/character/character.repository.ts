import { Character } from './character';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class CharacterRepository {
  abstract findById(id: string): Promise<Character | null>;
  abstract findBySessionId(sessionId: string): Promise<Character[]>;
  abstract save(character: Character): Promise<void>;
  /**
   * Single-row delete, used by `LeaveSessionUseCase` to remove only the
   * departing player's own `Character` without touching their co-players'.
   */
  abstract deleteById(id: string): Promise<void>;
  /** Bulk delete for `DeleteSessionCascade`. */
  abstract deleteBySessionId(sessionId: string): Promise<void>;
}
