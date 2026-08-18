import { GameSession } from './game-session';
import { TurnResolutionDiceRoll } from './turn-resolution';
import { TurnSubmission } from './turn-submission';

export interface TurnResolutionResult {
  narrationText: string;
  /**
   * Dice already rolled for this turn's mechanical actions (see
   * `DiceRollerPort`). Empty when no submission carried a
   * `mechanicalActionKey`. Persisted on the `TurnResolution` by
   * `SubmitTurnActionUseCase` so the turn log can render a
   * `dice-roll-chip` before the narration (see `DESIGN.md`).
   */
  diceRolls?: TurnResolutionDiceRoll[];
}

/**
 * Resolves a fully-submitted turn (every active `SessionPlayer` has
 * submitted) into a narration. `03-session-engine` shipped only a stub
 * implementation (`ConcatenatingSceneResolver`, concatenating submitted
 * actions, no LLM call) so the session lifecycle (submission -> resolution
 * -> narrating) could be exercised end-to-end without an external
 * dependency. `04-llm-orchestration` replaces the `SceneResolverPort`
 * binding in `session.module.ts` with `ResolveSceneUseCase`, the real
 * LLM-backed implementation - `SubmitTurnActionUseCase` depends only on
 * this port, so that swap required no change to the use-case itself.
 */
export abstract class SceneResolverPort {
  abstract resolve(
    session: GameSession,
    submissions: TurnSubmission[],
  ): Promise<TurnResolutionResult>;
}
