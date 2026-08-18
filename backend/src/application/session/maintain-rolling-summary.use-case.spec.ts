import { GameSession } from '../../domain/session/game-session';
import {
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  SceneResolutionOutput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';
import { TurnResolution } from '../../domain/session/turn-resolution';
import { InMemoryUsageQuotaPort } from '../usage-quota/in-memory-usage-quota.port';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { MaintainRollingSummaryUseCase } from './maintain-rolling-summary.use-case';

/** Records every summarize()/resolveScene() call's input for assertions. */
class RecordingLlmGameMasterPort extends LlmGameMasterPort {
  public summarizeCalls: SummarizeSceneInput[] = [];
  public nextSummary = 'Résumé condensé.';

  resolveScene(): Promise<SceneResolutionOutput> {
    throw new Error('not used in this spec');
  }

  summarize(input: SummarizeSceneInput): Promise<string> {
    this.summarizeCalls.push(input);
    return Promise.resolve(this.nextSummary);
  }

  assistCharacterCreation(): Promise<CharacterCreationAssistOutput> {
    throw new Error('not used in this spec');
  }

  narrateOpening(): Promise<{ narrationText: string }> {
    throw new Error('not used in this spec');
  }
}

function buildSession() {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

describe('MaintainRollingSummaryUseCase', () => {
  it('condenses the recent resolutions into an updated rolling summary and persists it', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const turnResolutionRepository = new InMemoryTurnResolutionRepository([
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 1,
        narrationText: 'Tour 1.',
      }),
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 2,
        narrationText: 'Tour 2.',
      }),
    ]);
    const llmGameMasterPort = new RecordingLlmGameMasterPort();
    llmGameMasterPort.nextSummary = 'Les héros ont fui le donjon.';
    const useCase = new MaintainRollingSummaryUseCase(
      gameSessionRepository,
      turnResolutionRepository,
      llmGameMasterPort,
      new InMemoryUsageQuotaPort(),
    );

    const updated = await useCase.execute({
      sessionId: session.id,
      rulesText: 'regles',
    });

    expect(updated?.rollingSummary).toBe('Les héros ont fui le donjon.');
    const persisted = await gameSessionRepository.findById(session.id);
    expect(persisted?.rollingSummary).toBe('Les héros ont fui le donjon.');
  });

  it('sends the previous rolling summary and the turns to summarize, oldest first', async () => {
    const session = buildSession().updateRollingSummary('Résumé précédent.');
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const turnResolutionRepository = new InMemoryTurnResolutionRepository([
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 1,
        narrationText: 'Tour 1.',
      }),
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 2,
        narrationText: 'Tour 2.',
      }),
    ]);
    const llmGameMasterPort = new RecordingLlmGameMasterPort();
    const useCase = new MaintainRollingSummaryUseCase(
      gameSessionRepository,
      turnResolutionRepository,
      llmGameMasterPort,
      new InMemoryUsageQuotaPort(),
    );

    await useCase.execute({ sessionId: session.id, rulesText: 'regles' });

    expect(llmGameMasterPort.summarizeCalls).toHaveLength(1);
    const call = llmGameMasterPort.summarizeCalls[0];
    expect(call.previousRollingSummary).toBe('Résumé précédent.');
    expect(call.turnsToSummarize.map((t) => t.turnNumber)).toEqual([1, 2]);
  });

  it('returns null and does nothing for an unknown session', async () => {
    const useCase = new MaintainRollingSummaryUseCase(
      new InMemoryGameSessionRepository(),
      new InMemoryTurnResolutionRepository(),
      new RecordingLlmGameMasterPort(),
      new InMemoryUsageQuotaPort(),
    );

    const result = await useCase.execute({
      sessionId: 'missing',
      rulesText: 'regles',
    });

    expect(result).toBeNull();
  });

  it('records a "summary" usage call after a successful summarize()', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const turnResolutionRepository = new InMemoryTurnResolutionRepository([
      TurnResolution.create({
        sessionId: session.id,
        turnNumber: 1,
        narrationText: 'Tour 1.',
      }),
    ]);
    const llmGameMasterPort = new RecordingLlmGameMasterPort();
    const usageQuotaPort = new InMemoryUsageQuotaPort();
    const useCase = new MaintainRollingSummaryUseCase(
      gameSessionRepository,
      turnResolutionRepository,
      llmGameMasterPort,
      usageQuotaPort,
    );

    await useCase.execute({
      sessionId: session.id,
      rulesText: 'regles',
      provider: 'openai',
    });

    expect(usageQuotaPort.recorded).toEqual([
      {
        sessionId: session.id,
        turnNumber: session.currentTurnNumber,
        provider: 'openai',
        callType: 'summary',
      },
    ]);
  });
});
