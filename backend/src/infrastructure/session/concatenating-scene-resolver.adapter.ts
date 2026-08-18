import { Injectable } from '@nestjs/common';
import { GameSession } from '../../domain/session/game-session';
import {
  SceneResolverPort,
  TurnResolutionResult,
} from '../../domain/session/scene-resolver.port';
import { TurnSubmission } from '../../domain/session/turn-submission';

/**
 * Stub `SceneResolverPort` implementation for this task: concatenates the
 * submitted actions into a placeholder narration, no LLM call. This is the
 * swap point `04-llm-orchestration` replaces with a real
 * `LlmGameMasterPort`-backed resolver - `SubmitTurnActionUseCase` depends
 * only on `SceneResolverPort`, so that swap requires no change to the
 * use-case.
 */
@Injectable()
export class ConcatenatingSceneResolver extends SceneResolverPort {
  resolve(
    _session: GameSession,
    submissions: TurnSubmission[],
  ): Promise<TurnResolutionResult> {
    const narrationText = submissions
      .map((submission) => `${submission.playerId} : ${submission.actionText}`)
      .join('\n');

    return Promise.resolve({ narrationText });
  }
}
