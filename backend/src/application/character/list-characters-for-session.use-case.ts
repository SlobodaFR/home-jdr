import { Injectable } from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';

/** Lists every character sheet belonging to a given session/party. */
@Injectable()
export class ListCharactersForSessionUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(sessionId: string): Promise<Character[]> {
    return this.characterRepository.findBySessionId(sessionId);
  }
}
