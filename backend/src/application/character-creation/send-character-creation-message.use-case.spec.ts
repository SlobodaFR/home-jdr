import { ConfigService } from '@nestjs/config';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  CharacterCreationAssistInput,
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  SceneResolutionOutput,
} from '../../domain/session/llm-game-master.port';
import { QuotaExceededError } from '../../domain/usage-quota/quota-exceeded.error';
import { InMemoryGameSystemRepository } from '../game-system/in-memory-game-system.repository';
import { InMemoryUsageQuotaPort } from '../usage-quota/in-memory-usage-quota.port';
import { InMemoryCharacterCreationSessionRepository } from './in-memory-character-creation-session.repository';
import { SendCharacterCreationMessageUseCase } from './send-character-creation-message.use-case';

/** Records the exact input it received, and returns a deterministic assist reply. */
class RecordingLlmGameMasterPort extends LlmGameMasterPort {
  public lastAssistInput?: CharacterCreationAssistInput;
  public nextOutput: CharacterCreationAssistOutput = {
    assistantMessage: 'Quel est le nom de ton personnage ?',
    draftUpdates: {},
    readyToFinalize: false,
  };

  resolveScene(): Promise<SceneResolutionOutput> {
    throw new Error('not used in this spec');
  }

  summarize(): Promise<string> {
    throw new Error('not used in this spec');
  }

  assistCharacterCreation(
    input: CharacterCreationAssistInput,
  ): Promise<CharacterCreationAssistOutput> {
    this.lastAssistInput = input;
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
    description: 'desc',
    adaptedForChildren: false,
    rulesText: 'Un d20 sous la stat reussit.',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: {
      hitPoints: { defaultMax: 20 },
      inventory: { defaultItems: ['torche'] },
      customAttributes: [
        { key: 'strength', label: 'Force', type: 'number', default: 10 },
      ],
    },
    mechanicalActions: [],
  });
}

function buildCreationSession() {
  return CharacterCreationSession.create({
    gameSessionId: 'game-session-1',
    gameSystemId: 'game-system-1',
    userId: 'user-1',
  });
}

describe('SendCharacterCreationMessageUseCase', () => {
  function buildUseCase(
    overrides: {
      creationSessionRepository?: InMemoryCharacterCreationSessionRepository;
      gameSystemRepository?: InMemoryGameSystemRepository;
      llm?: RecordingLlmGameMasterPort;
      usageQuotaPort?: InMemoryUsageQuotaPort;
      config?: ConfigService;
    } = {},
  ) {
    const creationSessionRepository =
      overrides.creationSessionRepository ??
      new InMemoryCharacterCreationSessionRepository([buildCreationSession()]);
    const gameSystemRepository =
      overrides.gameSystemRepository ??
      new InMemoryGameSystemRepository([buildGameSystem()]);
    const llm = overrides.llm ?? new RecordingLlmGameMasterPort();
    const usageQuotaPort =
      overrides.usageQuotaPort ?? new InMemoryUsageQuotaPort();
    const config = overrides.config ?? fakeConfig();

    const useCase = new SendCharacterCreationMessageUseCase(
      creationSessionRepository,
      gameSystemRepository,
      llm,
      usageQuotaPort,
      config,
    );

    return { useCase, creationSessionRepository, llm, usageQuotaPort };
  }

  it('calls the LLM with the rules text, target schema, full message history and current draft', async () => {
    const creationSession = buildCreationSession();
    const { useCase, llm } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await useCase.execute({
      characterCreationSessionId: creationSession.id,
      userId: 'user-1',
      message: 'Je veux jouer un nain guerrier.',
    });

    expect(llm.lastAssistInput?.rulesText).toBe('Un d20 sous la stat reussit.');
    expect(llm.lastAssistInput?.characterSheetSchema).toEqual({
      baseAttributes: { hitPoints: { max: 20 }, inventory: ['torche'] },
      customAttributes: [
        { key: 'strength', label: 'Force', type: 'number', default: 10 },
      ],
    });
    expect(llm.lastAssistInput?.messages).toHaveLength(2);
    expect(llm.lastAssistInput?.messages[0].role).toBe('assistant');
    expect(llm.lastAssistInput?.messages[1]).toEqual({
      role: 'user',
      content: 'Je veux jouer un nain guerrier.',
    });
    expect(llm.lastAssistInput?.draftCharacter).toEqual({});
  });

  it('appends the user message and assistant reply, and merges draft updates into the session', async () => {
    const creationSession = buildCreationSession();
    const { useCase, creationSessionRepository, llm } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });
    llm.nextOutput = {
      assistantMessage: 'Quel est le nom de ton personnage ?',
      draftUpdates: { name: 'Grognak' },
      readyToFinalize: false,
    };

    const updated = await useCase.execute({
      characterCreationSessionId: creationSession.id,
      userId: 'user-1',
      message: 'Je veux jouer un nain guerrier.',
    });

    expect(updated.draftCharacter).toEqual({ name: 'Grognak' });
    expect(updated.messages.slice(1)).toEqual([
      { role: 'user', content: 'Je veux jouer un nain guerrier.' },
      { role: 'assistant', content: 'Quel est le nom de ton personnage ?' },
    ]);
    const persisted = await creationSessionRepository.findById(
      creationSession.id,
    );
    expect(persisted?.draftCharacter).toEqual({ name: 'Grognak' });
  });

  it('records a "character_creation" usage call after a successful exchange', async () => {
    const creationSession = buildCreationSession();
    const { useCase, usageQuotaPort } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
      config: fakeConfig({ LLM_PROVIDER: 'openai' }),
    });

    await useCase.execute({
      characterCreationSessionId: creationSession.id,
      userId: 'user-1',
      message: 'Salut',
    });

    expect(usageQuotaPort.recorded).toHaveLength(1);
    expect(usageQuotaPort.recorded[0]).toMatchObject({
      sessionId: creationSession.gameSessionId,
      provider: 'openai',
      callType: 'character_creation',
    });
  });

  it('rejects a message from a user who does not own the creation session', async () => {
    const creationSession = buildCreationSession();
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'someone-else',
        message: 'Salut',
      }),
    ).rejects.toThrow();
  });

  it('rejects a message once the creation session is already completed', async () => {
    const creationSession = buildCreationSession().complete();
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
        message: 'Salut',
      }),
    ).rejects.toThrow();
  });

  it('throws QuotaExceededError and never calls the LLM when the daily quota is exhausted', async () => {
    const creationSession = buildCreationSession();
    const usageQuotaPort = new InMemoryUsageQuotaPort();
    usageQuotaPort.available = false;
    const { useCase, llm } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
      usageQuotaPort,
    });
    const assistSpy = jest.spyOn(llm, 'assistCharacterCreation');

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
        message: 'Salut',
      }),
    ).rejects.toThrow(QuotaExceededError);

    expect(assistSpy).not.toHaveBeenCalled();
  });
});
