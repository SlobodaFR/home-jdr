import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Character } from '../../domain/character/character';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  DiceRollerPort,
  DiceRollResult,
} from '../../domain/session/dice-roller.port';
import { GameSession } from '../../domain/session/game-session';
import {
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from '../character/in-memory-pending-character-delta.repository';
import { InMemoryGameSystemRepository } from '../game-system/in-memory-game-system.repository';
import { InMemoryUsageQuotaPort } from '../usage-quota/in-memory-usage-quota.port';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';
import { MaintainRollingSummaryUseCase } from './maintain-rolling-summary.use-case';
import { ResolveSceneUseCase } from './resolve-scene.use-case';
import { SubmitTurnActionUseCase } from './submit-turn-action.use-case';

class NoOpDiceRollerPort extends DiceRollerPort {
  roll(formula: string): DiceRollResult {
    return { formula, rolls: [10], modifier: 0, total: 10 };
  }
}

/** Fake LLM adapter: echoes back the rolling summary it was given, and updates it deterministically. */
class FakeLlmGameMasterPort extends LlmGameMasterPort {
  public resolveInputs: SceneResolutionInput[] = [];
  private turnCounter = 0;

  resolveScene(input: SceneResolutionInput): Promise<SceneResolutionOutput> {
    this.resolveInputs.push(input);
    this.turnCounter += 1;
    return Promise.resolve({
      narrationText: `Narration du tour ${this.turnCounter}.`,
      characterDeltas: [],
    });
  }

  summarize(input: SummarizeSceneInput): Promise<string> {
    const turns = input.turnsToSummarize.map((t) => t.turnNumber).join(',');
    return Promise.resolve(`Résumé après les tours ${turns}.`);
  }
}

function fakeConfig(values: Record<string, number> = {}): ConfigService {
  return {
    get: (key: string, fallback?: number) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

/**
 * End-to-end (application-layer) coverage of the last acceptance criterion
 * in `tasks/04-llm-orchestration.md`: "Le résumé glissant se met à jour
 * après N tours et est bien réinjecté dans l'appel suivant". Wires the real
 * `SubmitTurnActionUseCase` (from `03-session-engine`) to the real
 * `ResolveSceneUseCase` (this task) bound as its `SceneResolverPort`, with
 * `ROLLING_SUMMARY_INTERVAL=2` so the cycle triggers within a short test.
 */
describe('LLM orchestration flow - rolling summary is re-injected into the next call', () => {
  it('updates GameSession.rollingSummary every N turns and sends it back on the following resolveScene() call', async () => {
    const gameSystem = GameSystem.create({
      name: 'Donjons oublies',
      description: 'desc',
      adaptedForChildren: false,
      rulesText: 'regles',
      rulesSourceFileName: 'rules.pdf',
      characterSheetSchema: {
        hitPoints: { defaultMax: 30 },
        inventory: { defaultItems: [] },
        customAttributes: [],
      },
      mechanicalActions: [],
    });
    const session = GameSession.create({
      gameSystemId: gameSystem.id,
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
    const character = Character.create({
      id: 'character-1',
      gameSystemId: gameSystem.id,
      sessionId: session.id,
      ownerUserId: 'user-1',
      name: 'Grognak',
      hitPointsMax: 30,
      hitPointsCurrent: 30,
      inventory: [],
      customAttributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-1',
        characterId: 'character-1',
      }),
    ]);
    const turnSubmissionRepository = new InMemoryTurnSubmissionRepository();
    const turnResolutionRepository = new InMemoryTurnResolutionRepository();
    const characterRepository = new InMemoryCharacterRepository([character]);
    const gameSystemRepository = new InMemoryGameSystemRepository([gameSystem]);
    const pendingCharacterDeltaRepository =
      new InMemoryPendingCharacterDeltaRepository();
    const llm = new FakeLlmGameMasterPort();
    const config = fakeConfig({ ROLLING_SUMMARY_INTERVAL: 2 });
    const usageQuotaPort = new InMemoryUsageQuotaPort();

    const maintainRollingSummary = new MaintainRollingSummaryUseCase(
      gameSessionRepository,
      turnResolutionRepository,
      llm,
      usageQuotaPort,
    );
    const resolveScene = new ResolveSceneUseCase(
      characterRepository,
      gameSystemRepository,
      sessionPlayerRepository,
      new NoOpDiceRollerPort(),
      llm,
      pendingCharacterDeltaRepository,
      turnResolutionRepository,
      maintainRollingSummary,
      config,
      usageQuotaPort,
    );
    const submitTurnAction = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      turnSubmissionRepository,
      turnResolutionRepository,
      resolveScene,
      new EventEmitter2(),
    );

    // Turn 1 - below the interval, no summary refresh yet.
    await submitTurnAction.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: "J'ouvre la porte",
    });
    expect(
      (await gameSessionRepository.findById(session.id))?.rollingSummary,
    ).toBe('');

    // Turn 2 - hits ROLLING_SUMMARY_INTERVAL=2, triggers MaintainRollingSummaryUseCase.
    // Note: at the moment ResolveSceneUseCase triggers the summary (mid-resolution
    // of turn 2), turn 2's own TurnResolution has not been persisted yet
    // (SubmitTurnActionUseCase only saves it once resolve() returns) - so only
    // turn 1 is available to summarize here, which is the correct, intentional
    // one-turn lag (the next interval boundary folds turn 2 in).
    await submitTurnAction.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: 'Je continue',
    });
    const afterTurn2 = await gameSessionRepository.findById(session.id);
    expect(afterTurn2?.rollingSummary).toBe('Résumé après les tours 1.');

    // Turn 3 - the resolveScene() call must be given the freshly-updated summary.
    await submitTurnAction.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: "J'explore la salle suivante",
    });

    expect(llm.resolveInputs).toHaveLength(3);
    expect(llm.resolveInputs[2].rollingSummary).toBe(
      'Résumé après les tours 1.',
    );
    // The first two calls did not yet see the summary (it did not exist yet).
    expect(llm.resolveInputs[0].rollingSummary).toBe('');
    expect(llm.resolveInputs[1].rollingSummary).toBe('');
  });
});
