import { Character } from './character';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class CharacterRepository {
  abstract findById(id: string): Promise<Character | null>;
  abstract findBySessionId(sessionId: string): Promise<Character[]>;
  abstract save(character: Character): Promise<void>;
}
