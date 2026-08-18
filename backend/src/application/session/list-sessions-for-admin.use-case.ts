import { Injectable } from '@nestjs/common';
import { CharacterRepository } from '../../domain/character/character.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { SessionStatus } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';

export interface AdminSessionParticipantView {
  userId: string;
  characterName: string;
}

export interface AdminSessionView {
  id: string;
  name: string;
  gameSystemName: string;
  status: SessionStatus;
  currentTurnNumber: number;
  createdAt: Date;
  participants: AdminSessionParticipantView[];
}

/**
 * Admin-only sessions overview (see `AdminSessionsController`) - every
 * `GameSession` in the system, not scoped to the requesting admin's own
 * sessions (unlike `ListSessionsForUserUseCase`). Resolves each session's
 * game system name and participants (character name + owning user id) via
 * N+1-style per-session lookups: this is a low-traffic admin screen, no
 * pagination/batched join is warranted at this scale.
 */
@Injectable()
export class ListSessionsForAdminUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly characterRepository: CharacterRepository,
  ) {}

  async execute(): Promise<AdminSessionView[]> {
    const sessions = await this.gameSessionRepository.findAll();

    return Promise.all(
      sessions.map(async (session) => {
        const [gameSystem, players] = await Promise.all([
          this.gameSystemRepository.findById(session.gameSystemId),
          this.sessionPlayerRepository.findBySessionId(session.id),
        ]);

        const participants = await Promise.all(
          players.map(async (player) => {
            const character = await this.characterRepository.findById(
              player.characterId,
            );
            return {
              userId: player.userId,
              characterName: character?.name ?? 'Personnage inconnu',
            };
          }),
        );

        return {
          id: session.id,
          name: session.name,
          gameSystemName: gameSystem?.name ?? 'JdR inconnu',
          status: session.status,
          currentTurnNumber: session.currentTurnNumber,
          createdAt: session.createdAt,
          participants,
        };
      }),
    );
  }
}
