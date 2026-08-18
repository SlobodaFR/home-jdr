import { Injectable } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import { GameSessionRepository } from '../../domain/session/game-session.repository';
import { LlmGameMasterPort } from '../../domain/session/llm-game-master.port';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';
import { LlmProvider } from '../../domain/usage-quota/llm-usage-record';
import { UsageQuotaPort } from '../../domain/usage-quota/usage-quota.port';

/** How many of the most recent resolved turns are folded into a summary refresh. */
export const ROLLING_SUMMARY_WINDOW = 20;

export interface MaintainRollingSummaryInput {
  sessionId: string;
  rulesText: string;
  /** Which `LlmGameMasterPort` adapter is active - recorded on the usage audit trail. Defaults to "claude". */
  provider?: LlmProvider;
}

/**
 * Periodically condenses old turns into `GameSession.rollingSummary` (see
 * `PRD.md` - "Historique / mémoire longue"), so campaigns stay coherent
 * over many turns without re-sending the full turn history on every LLM
 * call. Triggered by `ResolveSceneUseCase` every N turns (see
 * `DEFAULT_ROLLING_SUMMARY_INTERVAL`), not on every turn.
 *
 * Calls the dedicated `LlmGameMasterPort.summarize()` method rather than
 * folding this into `resolveScene()`'s optional `updatedRollingSummary`
 * field - documented choice, see `LlmGameMasterPort` doc comment: keeps the
 * "resolve this turn" and "condense old history" concerns on two separate,
 * independently-testable calls.
 */
@Injectable()
export class MaintainRollingSummaryUseCase {
  constructor(
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly turnResolutionRepository: TurnResolutionRepository,
    private readonly llmGameMasterPort: LlmGameMasterPort,
    private readonly usageQuotaPort: UsageQuotaPort,
  ) {}

  async execute(
    input: MaintainRollingSummaryInput,
  ): Promise<GameSession | null> {
    const session = await this.gameSessionRepository.findById(input.sessionId);
    if (!session) {
      return null;
    }

    const recentResolutions =
      await this.turnResolutionRepository.findRecentBySessionId(
        session.id,
        ROLLING_SUMMARY_WINDOW,
      );
    if (recentResolutions.length === 0) {
      return session;
    }

    const updatedSummary = await this.llmGameMasterPort.summarize({
      rulesText: input.rulesText,
      previousRollingSummary: session.rollingSummary,
      turnsToSummarize: [...recentResolutions].reverse().map((resolution) => ({
        turnNumber: resolution.turnNumber,
        narrationText: resolution.narrationText,
      })),
    });

    // Audit-only (see tasks/08-admin-quotas-cost-guardrails.md) - the
    // billed call already happened above; recorded for the admin usage
    // dashboard, not gated by checkQuotaAvailable() (ResolveSceneUseCase
    // already gates the resolution this refresh piggybacks on).
    await this.usageQuotaPort.recordUsage({
      sessionId: session.id,
      turnNumber: session.currentTurnNumber,
      provider: input.provider ?? 'claude',
      callType: 'summary',
    });

    const updated = session.updateRollingSummary(updatedSummary);
    await this.gameSessionRepository.save(updated);
    return updated;
  }
}
