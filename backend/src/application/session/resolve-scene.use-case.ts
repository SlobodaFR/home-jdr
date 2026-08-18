import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CharacterRepository } from '../../domain/character/character.repository';
import { PendingCharacterDelta } from '../../domain/character/pending-character-delta';
import { PendingCharacterDeltaRepository } from '../../domain/character/pending-character-delta.repository';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { DiceRollerPort } from '../../domain/session/dice-roller.port';
import { GameSession } from '../../domain/session/game-session';
import {
  LlmGameMasterPort,
  SceneResolutionSubmittedAction,
} from '../../domain/session/llm-game-master.port';
import {
  SceneResolverPort,
  TurnResolutionResult,
} from '../../domain/session/scene-resolver.port';
import { SessionPlayerRepository } from '../../domain/session/session-player.repository';
import { TurnResolutionDiceRoll } from '../../domain/session/turn-resolution';
import { TurnResolutionRepository } from '../../domain/session/turn-resolution.repository';
import { TurnSubmission } from '../../domain/session/turn-submission';
import { QuotaExceededError } from '../../domain/usage-quota/quota-exceeded.error';
import { UsageQuotaPort } from '../../domain/usage-quota/usage-quota.port';
import { toCharacterDomainSchema } from './character-schema-adapter';
import { MaintainRollingSummaryUseCase } from './maintain-rolling-summary.use-case';

/** How many past resolutions are folded into the LLM prompt as plain-text recent history. */
export const DEFAULT_PROMPT_RECENT_TURNS_LIMIT = 5;

/** Every Nth resolved turn triggers a rolling-summary refresh (see `PRD.md` - "Historique / mémoire longue"). */
export const DEFAULT_ROLLING_SUMMARY_INTERVAL = 20;

/**
 * The real `SceneResolverPort` implementation, replacing the
 * `ConcatenatingSceneResolver` stub bound in `03-session-engine`. Lives in
 * `application/` (not `infrastructure/`) because it orchestrates several
 * domain ports (`DiceRollerPort`, `LlmGameMasterPort`,
 * `PendingCharacterDeltaRepository`...) rather than talking to a single
 * external system directly - the actual external calls stay behind
 * `LlmGameMasterPort`/`DiceRollerPort`, whose concrete adapters do live in
 * `infrastructure/session/` (see `CLAUDE.md`).
 *
 * `SubmitTurnActionUseCase` already guards idempotence (a resolution only
 * ever runs once per turn - see its own doc comment); this use-case adds no
 * new call path, so that guarantee still holds after this port swap (see
 * `CLAUDE.md` - "Idempotence des appels de résolution de scène").
 *
 * Left as a single entry point (`resolve()`) so `08-admin-quotas-cost-guardrails`
 * could wrap it with a quota check without restructuring anything here (see
 * `tasks/04-llm-orchestration.md`) - and indeed the only change that task
 * made is the `UsageQuotaPort.checkQuotaAvailable()` guard at the top of
 * `resolve()` plus the `recordUsage()` call after the billed LLM call.
 */
@Injectable()
export class ResolveSceneUseCase extends SceneResolverPort {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly sessionPlayerRepository: SessionPlayerRepository,
    private readonly diceRollerPort: DiceRollerPort,
    private readonly llmGameMasterPort: LlmGameMasterPort,
    private readonly pendingCharacterDeltaRepository: PendingCharacterDeltaRepository,
    private readonly turnResolutionRepository: TurnResolutionRepository,
    private readonly maintainRollingSummary: MaintainRollingSummaryUseCase,
    private readonly config: ConfigService,
    private readonly usageQuotaPort: UsageQuotaPort,
  ) {
    super();
  }

  async resolve(
    session: GameSession,
    submissions: TurnSubmission[],
  ): Promise<TurnResolutionResult> {
    // Guard-rail (see CLAUDE.md - "Jamais d'appel LLM sans vérification de
    // quota au préalable"): checked before any work that leads to a billed
    // LLM call or a dice roll, so quota exhaustion never consumes either.
    if (!(await this.usageQuotaPort.checkQuotaAvailable())) {
      throw new QuotaExceededError();
    }

    const gameSystem = await this.gameSystemRepository.findById(
      session.gameSystemId,
    );
    if (!gameSystem) {
      throw new NotFoundException('GameSystem not found for this session');
    }

    const [players, characters, recentResolutions] = await Promise.all([
      this.sessionPlayerRepository.findBySessionId(session.id),
      this.characterRepository.findBySessionId(session.id),
      this.turnResolutionRepository.findRecentBySessionId(
        session.id,
        DEFAULT_PROMPT_RECENT_TURNS_LIMIT,
      ),
    ]);

    const characterIdByPlayerId = new Map(
      players.map((player) => [player.userId, player.characterId]),
    );

    const submittedActions: SceneResolutionSubmittedAction[] = submissions.map(
      (submission) => {
        const characterId = characterIdByPlayerId.get(submission.playerId);
        if (!characterId) {
          throw new Error(
            `No character found for player "${submission.playerId}" in session "${session.id}"`,
          );
        }
        return {
          playerId: submission.playerId,
          characterId,
          actionText: submission.actionText,
          mechanicalActionKey: submission.mechanicalActionKey,
        };
      },
    );

    const diceRolls = this.rollMechanicalActions(
      submissions,
      gameSystem.mechanicalActions,
    );

    const output = await this.llmGameMasterPort.resolveScene({
      rulesText: gameSystem.rulesText,
      characterSheetSchema: toCharacterDomainSchema(
        gameSystem.characterSheetSchema,
      ),
      characters: characters.map((character) => ({
        characterId: character.id,
        name: character.name,
        hitPointsCurrent: character.hitPointsCurrent,
        hitPointsMax: character.hitPointsMax,
        inventory: character.inventory,
        customAttributes: character.customAttributes,
      })),
      recentTurns: [...recentResolutions].reverse().map((resolution) => ({
        turnNumber: resolution.turnNumber,
        narrationText: resolution.narrationText,
      })),
      rollingSummary: session.rollingSummary,
      submittedActions,
      diceFacts: diceRolls,
    });

    const llmProvider = this.config.get<'claude' | 'openai'>(
      'LLM_PROVIDER',
      'claude',
    );
    // Audit-only, post-hoc: the billed call already happened above - this
    // never gates it (see `checkQuotaAvailable()` at the top of this
    // method, and `tasks/08-admin-quotas-cost-guardrails.md`).
    await this.usageQuotaPort.recordUsage({
      sessionId: session.id,
      turnNumber: session.currentTurnNumber,
      provider: llmProvider,
      callType: 'scene_resolution',
    });

    // Deltas are proposed only - never applied here (see `PendingCharacterDelta`
    // / `ValidateCharacterDeltaUseCase` / `CLAUDE.md`).
    for (const characterDelta of output.characterDeltas) {
      const pendingDelta = PendingCharacterDelta.create({
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        characterId: characterDelta.characterId,
        deltaPayload: {
          hitPoints: characterDelta.delta.hitPoints,
          inventoryAdd: characterDelta.delta.inventoryAdd,
          inventoryRemove: characterDelta.delta.inventoryRemove,
          customAttributeChanges: characterDelta.delta.customAttributeChanges,
        },
      });
      await this.pendingCharacterDeltaRepository.save(pendingDelta);
    }

    const rawInterval = this.config.get<string | number>(
      'ROLLING_SUMMARY_INTERVAL',
    );
    const rollingSummaryInterval =
      rawInterval === undefined || rawInterval === ''
        ? DEFAULT_ROLLING_SUMMARY_INTERVAL
        : Number(rawInterval);
    if (
      rollingSummaryInterval > 0 &&
      session.currentTurnNumber % rollingSummaryInterval === 0
    ) {
      await this.maintainRollingSummary.execute({
        sessionId: session.id,
        rulesText: gameSystem.rulesText,
        provider: llmProvider,
      });
    }

    return { narrationText: output.narrationText, diceRolls };
  }

  private rollMechanicalActions(
    submissions: TurnSubmission[],
    mechanicalActions: {
      actionKey: string;
      label: string;
      diceFormula: string;
    }[],
  ): TurnResolutionDiceRoll[] {
    const diceRolls: TurnResolutionDiceRoll[] = [];
    for (const submission of submissions) {
      if (!submission.mechanicalActionKey) {
        continue;
      }
      const action = mechanicalActions.find(
        (candidate) => candidate.actionKey === submission.mechanicalActionKey,
      );
      if (!action) {
        // Unknown/stale action key - treat as a free action rather than failing the whole turn.
        continue;
      }
      const rollResult = this.diceRollerPort.roll(action.diceFormula);
      diceRolls.push({
        playerId: submission.playerId,
        actionKey: action.actionKey,
        actionLabel: action.label,
        formula: action.diceFormula,
        rolls: rollResult.rolls,
        total: rollResult.total,
      });
    }
    return diceRolls;
  }
}
