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

export type CharacterCreationMessageRole = 'assistant' | 'user';

export interface CharacterCreationMessage {
  role: CharacterCreationMessageRole;
  content: string;
}

/** Fields the guided conversation may propose so far - always a partial view, never the full sheet (schema defaults fill the rest at finalization). */
export interface CharacterCreationDraftCharacter {
  name?: string;
  hitPointsMax?: number;
  inventory?: string[];
  customAttributes?: Record<string, number | string>;
}

export interface CharacterCreationAssistInput {
  /** Full extracted rules text of the `GameSystem` (no RAG in V1 - see PRD.md). */
  rulesText: string;
  /** Target shape/defaults the character sheet should converge toward. */
  characterSheetSchema: CharacterSheetSchema;
  /** Full conversation so far, oldest first, including the player's latest message. */
  messages: CharacterCreationMessage[];
  draftCharacter: CharacterCreationDraftCharacter;
}

export interface OpeningNarrationInput {
  /** Full extracted rules text of the `GameSystem` (no RAG in V1 - see PRD.md). */
  rulesText: string;
  characterSheetSchema: CharacterSheetSchema;
  gameSystemName: string;
  gameSystemDescription: string;
  /** Every character finalized so far for this session, name + starting stats. */
  characters: SceneResolutionCharacterState[];
}

export interface OpeningNarrationOutput {
  /** Proactive scene-setting narration - no deltas, nothing has mechanically happened yet. */
  narrationText: string;
}

export interface CharacterCreationAssistOutput {
  /** The next thing the AI says to the player. */
  assistantMessage: string;
  /** Fields to merge into the draft - omitted fields stay as-is (never destructive). */
  draftUpdates: Partial<CharacterCreationDraftCharacter>;
  /**
   * ADVISORY hint only, for the UI (e.g. enabling a "the AI thinks we're
   * done" nudge) - `FinalizeCharacterCreationUseCase` must independently
   * verify `draftCharacter.name` is a non-empty string regardless of this
   * flag. Never treat this as authoritative for the finalize state
   * transition (see `tasks/` addendum on character creation).
   */
  readyToFinalize: boolean;
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

  /**
   * One step of the guided character-creation conversation: given the
   * conversation so far and the current draft, returns the AI's next
   * message plus any draft field updates. Called from
   * `SendCharacterCreationMessageUseCase`, gated by
   * `UsageQuotaPort.checkQuotaAvailable()` exactly like `resolveScene()` -
   * see `CLAUDE.md` ("Jamais d'appel LLM sans vérification de quota au
   * préalable" applies to every LLM call, not just scene resolution).
   */
  abstract assistCharacterCreation(
    input: CharacterCreationAssistInput,
  ): Promise<CharacterCreationAssistOutput>;

  /**
   * Genuinely proactive scene-setting narration, generated once every
   * player of a session has finalized their character and before anyone has
   * submitted a turn action - sets the scene, introduces the world/situation,
   * and acknowledges the finalized characters by name. Called from
   * `NarrateSessionOpeningUseCase`, gated by
   * `UsageQuotaPort.checkQuotaAvailable()` exactly like `resolveScene()` -
   * see `CLAUDE.md` ("Jamais d'appel LLM sans vérification de quota au
   * préalable" applies to every LLM call, not just scene resolution). This
   * is NOT a `TurnResolution` (no dice, no deltas - see `TurnResolution`'s
   * `turnNumber >= 1` invariant) and never touches turn-counting.
   */
  abstract narrateOpening(
    input: OpeningNarrationInput,
  ): Promise<OpeningNarrationOutput>;
}
