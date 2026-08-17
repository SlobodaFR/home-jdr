import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';

/** Test double shared by the character use-case specs. */
export class InMemoryCharacterRepository extends CharacterRepository {
  constructor(private characters: Character[] = []) {
    super();
  }

  findById(id: string): Promise<Character | null> {
    return Promise.resolve(this.characters.find((c) => c.id === id) ?? null);
  }

  findBySessionId(sessionId: string): Promise<Character[]> {
    return Promise.resolve(
      this.characters.filter((c) => c.sessionId === sessionId),
    );
  }

  save(character: Character): Promise<void> {
    this.characters = [
      ...this.characters.filter((c) => c.id !== character.id),
      character,
    ];
    return Promise.resolve();
  }
}
