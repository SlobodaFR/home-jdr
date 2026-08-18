import { Injectable, NotFoundException } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';
import { TurnSubmissionRepository } from '../../domain/session/turn-submission.repository';

export const DEFAULT_RECENT_TURNS_LIMIT = 5;

export interface SessionPlayerStateView {
  userId: string;
  characterId: string;
  hasSubmittedCurrentTurn: boolean;
}

export interface SessionStateView {
  session: GameSession;
  players: SessionPlayerStateView[];
  recentResolutions: TurnResolution[];
}

/**
 * Powers the polling endpoint (`GET /api/sessions/:id/state`). Must run in
 * constant time regardless of how many turns the session has accumulated:
 * it never loads the full `TurnResolution` history, only the current turn's
 * submissions and the `recentTurnsLimit` most recent resolutions (see
 * `tasks/03-session-engine.md` - critere d'acceptation).
 */
@Injectable()
export class GetSessionStateUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly turnSubmissionRepository: TurnSubmissionRepository,
    private readonly turnResolutionRepository: TurnResolutionRepository,
  ) {}

  async execute(
    sessionId: string,
    recentTurnsLimit: number = DEFAULT_RECENT_TURNS_LIMIT,
  ): Promise<SessionStateView> {
    const session = await this.gameSessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const [players, submissions, recentResolutions] = await Promise.all([
      this.sessionPlayerRepository.findBySessionId(sessionId),
      this.turnSubmissionRepository.findBySessionAndTurn(
        sessionId,
        session.currentTurnNumber,
      ),
      this.turnResolutionRepository.findRecentBySessionId(
        sessionId,
        recentTurnsLimit,
      ),
    ]);

    const submittedUserIds = new Set(
      submissions.map((submission) => submission.playerId),
    );

    return {
      session,
      players: players.map((player) => ({
        userId: player.userId,
        characterId: player.characterId,
        hasSubmittedCurrentTurn: submittedUserIds.has(player.userId),
      })),
      recentResolutions,
    };
  }
}
