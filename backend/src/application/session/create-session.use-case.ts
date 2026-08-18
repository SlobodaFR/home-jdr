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
import { InviteCodeGeneratorPort } from '../../domain/session/invite-code-generator.port';
import { SessionPlayer } from '../../domain/session/session-player';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { UserRole } from '../../domain/user/user-profile';
import { toCharacterDomainSchema } from './character-schema-adapter';

export interface CreateSessionInput {
  gameSystemId: string;
  name: string;
  createdByUserId: string;
  createdByUserRole: UserRole;
  characterName: string;
}

export interface CreateSessionResult {
  session: GameSession;
  character: Character;
}

const MAX_INVITE_CODE_ATTEMPTS = 10;

/**
 * Creates a game session and immediately seats its creator as the first
 * `SessionPlayer` (with a freshly created `Character`) - per `PRD.md`,
 * "Solo = cas particulier du multi", a session always starts with at least
 * one player.
 */
@Injectable()
export class CreateSessionUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly inviteCodeGenerator: InviteCodeGeneratorPort,
  ) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionResult> {
    const gameSystem = await this.gameSystemRepository.findById(
      input.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('Game system not found');
    }
    if (input.createdByUserRole === 'child' && !gameSystem.adaptedForChildren) {
      throw new ForbiddenException(
        "Ce JdR n'est pas adapté aux comptes enfant : impossible de créer une partie avec.",
      );
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const session = GameSession.create({
      gameSystemId: gameSystem.id,
      name: input.name,
      inviteCode,
      createdByUserId: input.createdByUserId,
    });
    await this.gameSessionRepository.save(session);

    const character = Character.fromSchema({
      id: randomUUID(),
      gameSystemId: gameSystem.id,
      sessionId: session.id,
      ownerUserId: input.createdByUserId,
      name: input.characterName,
      schema: toCharacterDomainSchema(gameSystem.characterSheetSchema),
      now: new Date(),
    });
    await this.characterRepository.save(character);

    const player = SessionPlayer.create({
      sessionId: session.id,
      userId: input.createdByUserId,
      characterId: character.id,
    });
    await this.sessionPlayerRepository.save(player);

    return { session, character };
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
      const code = this.inviteCodeGenerator.generate();
      const existing = await this.gameSessionRepository.findByInviteCode(code);
      if (!existing) {
        return code;
      }
    }
    throw new Error('Unable to generate a unique invite code');
  }
}
