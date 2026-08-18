import { ConfigService } from '@nestjs/config';
import { Character } from '../../domain/character/character';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSession } from '../../domain/session/game-session';
import {
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  OpeningNarrationInput,
  OpeningNarrationOutput,
  SceneResolutionOutput,
} from '../../domain/session/llm-game-master.port';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryGameSystemRepository } from '../game-system/in-memory-game-system.repository';
import { InMemoryUsageQuotaPort } from '../usage-quota/in-memory-usage-quota.port';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { NarrateSessionOpeningUseCase } from './narrate-session-opening.use-case';

/** Records the exact input it received, and returns a deterministic opening narration. */
class RecordingLlmGameMasterPort extends LlmGameMasterPort {
  public lastNarrateOpeningInput?: OpeningNarrationInput;
  public nextOutput: OpeningNarrationOutput = {
    narrationText: 'Le vent souffle sur les ruines de Karak-Dun...',
  };

  resolveScene(): Promise<SceneResolutionOutput> {
    throw new Error('not used in this spec');
  }

  summarize(): Promise<string> {
    throw new Error('not used in this spec');
  }

  assistCharacterCreation(): Promise<CharacterCreationAssistOutput> {
    throw new Error('not used in this spec');
  }

  narrateOpening(
    input: OpeningNarrationInput,
  ): Promise<OpeningNarrationOutput> {
    this.lastNarrateOpeningInput = input;
    return Promise.resolve(this.nextOutput);
  }
}

function fakeConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function buildGameSystem() {
  return GameSystem.create({
    id: 'game-system-1',
    name: 'Donjons oublies',
    description: 'Un JdR de fantasy classique.',
    adaptedForChildren: false,
    rulesText: 'Un d20 sous la stat reussit.',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 30 },
      inventory: { defaultItems: [] },
      customAttributes: [],
    },
    mechanicalActions: [],
  });
}

function buildCharacter(id: string, ownerUserId: string, sessionId: string) {
  return Character.create({
    id,
    gameSystemId: 'game-system-1',
    sessionId,
    ownerUserId,
    name: `Perso ${id}`,
    hitPointsMax: 30,
    hitPointsCurrent: 30,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('NarrateSessionOpeningUseCase', () => {
  function buildUseCase(
    overrides: {
      gameSystem?: GameSystem;
      llm?: RecordingLlmGameMasterPort;
      gameSessionRepository?: InMemoryGameSessionRepository;
      gameSystemRepository?: InMemoryGameSystemRepository;
      characterRepository?: InMemoryCharacterRepository;
      usageQuotaPort?: InMemoryUsageQuotaPort;
      config?: ConfigService;
    } = {},
  ) {
    const gameSystem = overrides.gameSystem ?? buildGameSystem();
    const session = GameSession.create({
      gameSystemId: gameSystem.id,
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
    const character = buildCharacter('character-1', 'user-1', session.id);

    const gameSystemRepository =
      overrides.gameSystemRepository ??
      new InMemoryGameSystemRepository([gameSystem]);
    const characterRepository =
      overrides.characterRepository ??
      new InMemoryCharacterRepository([character]);
    const gameSessionRepository =
      overrides.gameSessionRepository ??
      new InMemoryGameSessionRepository([session]);
    const llm = overrides.llm ?? new RecordingLlmGameMasterPort();
    const usageQuotaPort =
      overrides.usageQuotaPort ?? new InMemoryUsageQuotaPort();
    const config = overrides.config ?? fakeConfig();

    const useCase = new NarrateSessionOpeningUseCase(
      gameSessionRepository,
      gameSystemRepository,
      characterRepository,
      llm,
      usageQuotaPort,
      config,
    );

    return {
      useCase,
      session,
      gameSystem,
      character,
      llm,
      gameSessionRepository,
      usageQuotaPort,
    };
  }

  it('narrates the opening scene, persists it on the session, and records usage', async () => {
    const { useCase, session, llm, gameSessionRepository, usageQuotaPort } =
      buildUseCase();

    const result = await useCase.execute({ sessionId: session.id });

    expect(result?.openingNarrationText).toBe(
      'Le vent souffle sur les ruines de Karak-Dun...',
    );
    const persisted = await gameSessionRepository.findById(session.id);
    expect(persisted?.openingNarrationText).toBe(
      'Le vent souffle sur les ruines de Karak-Dun...',
    );

    expect(llm.lastNarrateOpeningInput?.rulesText).toBe(
      'Un d20 sous la stat reussit.',
    );
    expect(llm.lastNarrateOpeningInput?.characters).toHaveLength(1);
    expect(llm.lastNarrateOpeningInput?.characters[0].name).toBe(
      'Perso character-1',
    );

    expect(usageQuotaPort.recorded).toEqual([
      {
        sessionId: session.id,
        turnNumber: 0,
        provider: 'claude',
        callType: 'opening_narration',
      },
    ]);
  });

  it('returns null and does nothing for an unknown session', async () => {
    const { useCase, llm } = buildUseCase({
      gameSessionRepository: new InMemoryGameSessionRepository([]),
    });
    const narrateOpeningSpy = jest.spyOn(llm, 'narrateOpening');

    const result = await useCase.execute({ sessionId: 'missing-session' });

    expect(result).toBeNull();
    expect(narrateOpeningSpy).not.toHaveBeenCalled();
  });

  it('does not call the LLM and leaves the session untouched when the quota is exhausted', async () => {
    const usageQuotaPort = new InMemoryUsageQuotaPort();
    usageQuotaPort.available = false;
    const { useCase, session, llm, gameSessionRepository } = buildUseCase({
      usageQuotaPort,
    });
    const narrateOpeningSpy = jest.spyOn(llm, 'narrateOpening');

    const result = await useCase.execute({ sessionId: session.id });

    expect(narrateOpeningSpy).not.toHaveBeenCalled();
    expect(result?.openingNarrationText).toBeNull();
    const persisted = await gameSessionRepository.findById(session.id);
    expect(persisted?.openingNarrationText).toBeNull();
  });
});
