import { Injectable, NotFoundException } from '@nestjs/common';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';
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
  /**
   * Pending (not yet validated/rejected) character deltas proposed for each
   * of `recentResolutions`, keyed by `turnNumber` - powers the
   * `delta-proposal-card` in the turn log (see `DESIGN.md`,
   * `tasks/04-llm-orchestration.md`). Only fetched for the bounded set of
   * recent turns already loaded above, so this stays O(recentTurnsLimit)
   * regardless of session age, same constant-time guarantee as
   * `recentResolutions` itself.
   */
  pendingDeltasByTurn: Record<number, PendingCharacterDelta[]>;
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
    private readonly pendingCharacterDeltaRepository: PendingCharacterDeltaRepository,
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

    const pendingDeltasByTurn: Record<number, PendingCharacterDelta[]> = {};
    await Promise.all(
      recentResolutions.map(async (resolution) => {
        pendingDeltasByTurn[resolution.turnNumber] =
          await this.pendingCharacterDeltaRepository.findBySessionAndTurn(
            sessionId,
            resolution.turnNumber,
          );
      }),
    );

    return {
      session,
      players: players.map((player) => ({
        userId: player.userId,
        characterId: player.characterId,
        hasSubmittedCurrentTurn: submittedUserIds.has(player.userId),
      })),
      recentResolutions,
      pendingDeltasByTurn,
    };
  }
}
