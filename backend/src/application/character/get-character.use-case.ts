import { Injectable, NotFoundException } from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';

/** Fetches a single character sheet by id. */
@Injectable()
export class GetCharacterUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(id: string): Promise<Character> {
    const character = await this.characterRepository.findById(id);
    if (!character) {
      throw new NotFoundException('Character not found');
    }
    return character;
  }
}
