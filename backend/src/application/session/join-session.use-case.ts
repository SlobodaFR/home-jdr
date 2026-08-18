import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayer } from '../../domain/session/session-player';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { UserRole } from '../../domain/user/user-profile';
import { toCharacterDomainSchema } from './character-schema-adapter';

export interface JoinSessionInput {
  inviteCode: string;
  userId: string;
  userRole: UserRole;
  characterName: string;
}

export interface JoinSessionResult {
  session: GameSession;
  character: Character;
}

/**
 * Joins an existing `GameSession` by invite code, creating the joining
 * player's `Character` and `SessionPlayer` row. Rejects a `child` account
 * from a session whose `GameSystem` is not flagged `adaptedForChildren`
 * (see `PRD.md` and the acceptance criteria in
 * `tasks/03-session-engine.md`).
 *
 * Re-joining with the same invite code as an already-seated player is
 * idempotent: it returns the existing seat instead of creating a second
 * character/player row.
 */
@Injectable()
export class JoinSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(input: JoinSessionInput): Promise<JoinSessionResult> {
    const session = await this.gameSessionRepository.findByInviteCode(
      input.inviteCode.trim().toUpperCase(),
    );
    if (!session) {
      throw new NotFoundException(
        "Aucune partie ne correspond à ce code d'invitation.",
      );
    }

    const gameSystem = await this.gameSystemRepository.findById(
      session.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }
    if (input.userRole === 'child' && !gameSystem.adaptedForChildren) {
      throw new ForbiddenException(
        "Ce JdR n'est pas adapté aux comptes enfant : impossible de rejoindre cette partie.",
      );
    }

    const existingPlayer =
      await this.sessionPlayerRepository.findBySessionAndUser(
        session.id,
        input.userId,
      );
    if (existingPlayer) {
      const character = await this.characterRepository.findById(
        existingPlayer.characterId,
      );
      if (character) {
        return { session, character };
      }
    }

    const character = Character.fromSchema({
      id: randomUUID(),
      gameSystemId: gameSystem.id,
      sessionId: session.id,
      ownerUserId: input.userId,
      name: input.characterName,
      schema: toCharacterDomainSchema(gameSystem.characterSheetSchema),
      now: new Date(),
    });
    await this.characterRepository.save(character);

    const player = SessionPlayer.create({
      sessionId: session.id,
      userId: input.userId,
      characterId: character.id,
    });
    await this.sessionPlayerRepository.save(player);

    return { session, character };
  }
}
