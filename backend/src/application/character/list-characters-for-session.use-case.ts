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
 * Lists character sheets belonging to a given session/party, gated by the
 * session's `charactersVisibleToOthers` choice (per-session, set once at
 * creation - see `GameSession`):
 *
 * - The requester must be an active `SessionPlayer` of the session (a
 *   non-player, or a player still mid-character-creation themselves, gets a
 *   403 - they have no stake in the session yet).
 * - If `charactersVisibleToOthers` is true, every character of the session
 *   is returned.
 * - Otherwise, only the requester's own character(s) are returned.
 */
@Injectable()
export class ListCharactersForSessionUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
  ) {}

  async execute(
    sessionId: string,
    requestingUserId: string,
  ): Promise<Character[]> {
    const session = await this.gameSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const requester = await this.sessionPlayerRepository.findBySessionAndUser(
      sessionId,
      requestingUserId,
    );
    if (!requester) {
      throw new ForbiddenException(
        'Only active players of this session can view its characters',
      );
    }

    const characters =
      await this.characterRepository.findBySessionId(sessionId);
    if (session.charactersVisibleToOthers) {
      return characters;
    }
    return characters.filter(
      (character) => character.ownerUserId === requestingUserId,
    );
  }
}
