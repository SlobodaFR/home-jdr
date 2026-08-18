import { CharacterSheetSchema } from '../character/character-sheet-schema';
import { CharacterStateDelta } from '../character/character-state-delta';

export interface SceneResolutionCharacterState {
  characterId: string;
  name: string;
  hitPointsCurrent: number;
  hitPointsMax: number;
  inventory: { name: string; quantity: number }[];
  customAttributes: Record<string, number | string>;
}

export interface SceneResolutionSubmittedAction {
  playerId: string;
  characterId: string;
  actionText: string;
  /** Set only when the player picked a `GameSystem.mechanicalActions` entry at submission time. */
  mechanicalActionKey?: string;
}

/** A dice result already rolled server-side, injected as a non-negotiable fact (see `DiceRollerPort`). */
export interface SceneResolutionDiceFact {
  playerId: string;
  actionKey: string;
  actionLabel: string;
  formula: string;
  rolls: number[];
  total: number;
}

export interface SceneResolutionRecentTurn {
  turnNumber: number;
  narrationText: string;
}

export interface SceneResolutionInput {
  /** Full extracted rules text of the `GameSystem` (no RAG in V1 - see PRD.md). */
  rulesText: string;
  characterSheetSchema: CharacterSheetSchema;
  characters: SceneResolutionCharacterState[];
  /** N last resolved turns, plain text, oldest first. */
  recentTurns: SceneResolutionRecentTurn[];
  /** Current rolling summary of everything older than `recentTurns` (empty string if none yet). */
  rollingSummary: string;
  submittedActions: SceneResolutionSubmittedAction[];
  /** Dice already rolled for this turn's mechanical actions - the LLM must respect these, never invent its own. */
  diceFacts: SceneResolutionDiceFact[];
}

export interface SceneResolutionCharacterDelta {
  characterId: string;
  delta: CharacterStateDelta;
}

export interface SceneResolutionOutput {
  narrationText: string;
  /** Proposed, NOT applied - see `PendingCharacterDelta` / `ValidateCharacterDeltaUseCase`. */
  characterDeltas: SceneResolutionCharacterDelta[];
  /**
   * Only set when this call itself was asked to fold in a summary cycle.
   * `ResolveSceneUseCase` in this codebase always drives summary updates
   * through the dedicated `summarize()` method below instead (documented in
   * `MaintainRollingSummaryUseCase`), so adapters may leave this undefined.
   */
  updatedRollingSummary?: string;
}

export interface SummarizeSceneInput {
  rulesText: string;
  previousRollingSummary: string;
  /** The turns to fold into the summary, oldest first. */
  turnsToSummarize: SceneResolutionRecentTurn[];
}

/**
 * Port (driven side) implemented by the infrastructure layer. `Claude`
 * and `OpenAI` adapters live in `infrastructure/session/`, selected at
 * runtime via `LLM_PROVIDER` (see `.env.example`). Never call a third-party
 * LLM API directly from `application/` - always go through this port (see
 * `CLAUDE.md`).
 */
export abstract class LlmGameMasterPort {
  /**
   * Resolves one fully-submitted turn into a narration plus proposed state
   * deltas. Dice results are already known (`input.diceFacts`) and MUST be
   * respected verbatim in the narration, never re-rolled or contradicted.
   */
  abstract resolveScene(
    input: SceneResolutionInput,
  ): Promise<SceneResolutionOutput>;

  /**
   * Condenses `turnsToSummarize` (folded on top of `previousRollingSummary`)
   * into a new rolling summary. Called periodically (every N turns, see
   * `MaintainRollingSummaryUseCase`), not on every turn.
   */
  abstract summarize(input: SummarizeSceneInput): Promise<string>;
}
