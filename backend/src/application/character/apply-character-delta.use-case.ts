import { Injectable, NotFoundException } from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { CharacterStateDelta } from '../../domain/character/character-state-delta';

/**
 * Applies an already-validated `CharacterStateDelta` to a character sheet.
 *
 * This use-case does not decide *whether* a delta should be applied — that
 * decision (proposal + human validation) is built in `04-llm-orchestration`.
 * By the time this use-case runs, the delta is already approved; it only
 * persists the resulting state.
 */
@Injectable()
export class ApplyCharacterDeltaUseCase {
  constructor(private readonly characterRepository: CharacterRepository) {}

  async execute(
    characterId: string,
    delta: CharacterStateDelta,
  ): Promise<Character> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const updated = character.applyDelta(delta);
    await this.characterRepository.save(updated);

    return updated;
  }
}
