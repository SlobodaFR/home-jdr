import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';

/**
 * Fetches a single character sheet by id, gated by ownership or the
 * session's `charactersVisibleToOthers` choice:
 *
 * - Always allowed if the requester owns the character.
 * - Otherwise, only allowed if the requester is an active `SessionPlayer` of
 *   the SAME session as the character AND that session has
 *   `charactersVisibleToOthers === true` - else 403.
 */
@Injectable()
export class GetCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
  ) {}

  async execute(id: string, requestingUserId: string): Promise<Character> {
    const character = await this.characterRepository.findById(id);
    if (!character) {
      throw new NotFoundException('Character not found');
    }
    if (character.ownerUserId === requestingUserId) {
      return character;
    }

    const session = await this.gameSessionRepository.findById(
      character.sessionId,
    );
    if (!session || !session.charactersVisibleToOthers) {
      throw new ForbiddenException(
        'You are not allowed to view this character',
      );
    }

    const requester = await this.sessionPlayerRepository.findBySessionAndUser(
      character.sessionId,
      requestingUserId,
    );
    if (!requester) {
      throw new ForbiddenException(
        'You are not allowed to view this character',
      );
    }

    return character;
  }
}
