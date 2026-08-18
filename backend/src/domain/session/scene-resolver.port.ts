import { GameSession } from './game-session';
import { TurnSubmission } from './turn-submission';

export interface TurnResolutionResult {
  narrationText: string;
}

/**
 * Point d'extension for `04-llm-orchestration`. Resolves a fully-submitted
 * turn (every active `SessionPlayer` has submitted) into a narration.
 *
 * This task ships only a stub implementation
 * (`infrastructure/session/concatenating-scene-resolver.adapter.ts`) that
 * concatenates the submitted actions with no LLM call, so the session
 * lifecycle (submission -> resolution -> narrating) can be exercised
 * end-to-end without an external dependency. `SubmitTurnActionUseCase`
 * depends only on this port, so swapping in the real LLM call later
 * requires no change to the use-case.
 */
export abstract class SceneResolverPort {
  abstract resolve(
    session: GameSession,
    submissions: TurnSubmission[],
  ): Promise<TurnResolutionResult>;
}
