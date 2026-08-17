import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';

export interface CreateCharacterInput {
  gameSystemId: string;
  sessionId: string;
  ownerUserId: string;
  name: string;
  /**
   * The `GameSystem.characterSheetSchema` for `gameSystemId`. Passed in by
   * the caller (which already fetched the `GameSystem`) rather than looked
   * up here, so this use-case has no dependency on `01-game-catalog`.
   */
  schema: CharacterSheetSchema;
}

/** Creates a character sheet, initializing its attributes from a `GameSystem` schema. */
@Injectable()
export class CreateCharacterUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(input: CreateCharacterInput): Promise<Character> {
    const character = Character.fromSchema({
      id: randomUUID(),
      gameSystemId: input.gameSystemId,
      sessionId: input.sessionId,
      ownerUserId: input.ownerUserId,
      name: input.name,
      schema: input.schema,
      now: new Date(),
    });

    await this.characterRepository.save(character);

    return character;
  }
}
