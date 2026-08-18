import { ConfigService } from '@nestjs/config';
import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
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
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { NarrateSessionOpeningUseCase } from '../session/narrate-session-opening.use-case';
import { InMemoryUsageQuotaPort } from '../usage-quota/in-memory-usage-quota.port';
import { FinalizeCharacterCreationUseCase } from './finalize-character-creation.use-case';
import { InMemoryCharacterCreationSessionRepository } from './in-memory-character-creation-session.repository';

/** Records every narrateOpening() call, deterministic reply otherwise unused methods throw. */
class RecordingLlmGameMasterPort extends LlmGameMasterPort {
  public narrateOpeningCallCount = 0;
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
    this.narrateOpeningCallCount += 1;
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
    description: 'desc',
    adaptedForChildren: false,
    rulesText: 'texte des regles',
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

function buildGameSession() {
  return GameSession.create({
    id: 'game-session-1',
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

function buildCreationSession(overrides: { userId?: string } = {}) {
  return CharacterCreationSession.create({
    gameSessionId: 'game-session-1',
    gameSystemId: 'game-system-1',
    userId: overrides.userId ?? 'user-1',
  });
}

function readyCreationSession(userId: string, name: string) {
  return buildCreationSession({ userId }).appendExchange({
    userMessage: `Je m'appelle ${name}.`,
    assistantMessage: 'Bien note.',
    draftUpdates: { name },
  });
}

describe('FinalizeCharacterCreationUseCase', () => {
  function buildUseCase(
    overrides: {
      creationSessionRepository?: InMemoryCharacterCreationSessionRepository;
      gameSystemRepository?: InMemoryGameSystemRepository;
      characterRepository?: InMemoryCharacterRepository;
      sessionPlayerRepository?: InMemorySessionPlayerRepository;
      gameSessionRepository?: InMemoryGameSessionRepository;
      llm?: RecordingLlmGameMasterPort;
      usageQuotaPort?: InMemoryUsageQuotaPort;
    } = {},
  ) {
    const creationSessionRepository =
      overrides.creationSessionRepository ??
      new InMemoryCharacterCreationSessionRepository([buildCreationSession()]);
    const gameSystemRepository =
      overrides.gameSystemRepository ??
      new InMemoryGameSystemRepository([buildGameSystem()]);
    const characterRepository =
      overrides.characterRepository ?? new InMemoryCharacterRepository();
    const sessionPlayerRepository =
      overrides.sessionPlayerRepository ??
      new InMemorySessionPlayerRepository();
    const gameSessionRepository =
      overrides.gameSessionRepository ??
      new InMemoryGameSessionRepository([buildGameSession()]);
    const llm = overrides.llm ?? new RecordingLlmGameMasterPort();
    const usageQuotaPort =
      overrides.usageQuotaPort ?? new InMemoryUsageQuotaPort();

    const narrateSessionOpening = new NarrateSessionOpeningUseCase(
      gameSessionRepository,
      gameSystemRepository,
      characterRepository,
      llm,
      usageQuotaPort,
      fakeConfig(),
    );

    const useCase = new FinalizeCharacterCreationUseCase(
      creationSessionRepository,
      gameSystemRepository,
      characterRepository,
      sessionPlayerRepository,
      gameSessionRepository,
      narrateSessionOpening,
    );

    return {
      useCase,
      creationSessionRepository,
      characterRepository,
      sessionPlayerRepository,
      gameSessionRepository,
      llm,
      usageQuotaPort,
    };
  }

  it('rejects finalizing with an empty/missing draft name, without creating a Character or SessionPlayer', async () => {
    const creationSession = buildCreationSession(); // draft.name is undefined
    const { useCase, characterRepository, sessionPlayerRepository } =
      buildUseCase({
        creationSessionRepository:
          new InMemoryCharacterCreationSessionRepository([creationSession]),
      });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
      }),
    ).rejects.toThrow(/nom/);

    expect(
      await characterRepository.findBySessionId('game-session-1'),
    ).toHaveLength(0);
    expect(
      await sessionPlayerRepository.findBySessionId('game-session-1'),
    ).toHaveLength(0);
  });

  it('rejects finalizing with a blank (whitespace-only) draft name', async () => {
    const creationSession = buildCreationSession().appendExchange({
      userMessage: 'Mon perso',
      assistantMessage: 'Ok',
      draftUpdates: { name: '   ' },
    });
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
      }),
    ).rejects.toThrow(/nom/);
  });

  it('builds the Character from schema defaults overridden by the draft, creates the SessionPlayer, and completes the creation session', async () => {
    const creationSession = buildCreationSession().appendExchange({
      userMessage: 'Un nain guerrier avec une hache.',
      assistantMessage: 'Bien note.',
      draftUpdates: {
        name: 'Grognak',
        hitPointsMax: 35,
        inventory: ['hache', 'bouclier'],
        customAttributes: { strength: 16 },
      },
    });
    const {
      useCase,
      creationSessionRepository,
      characterRepository,
      sessionPlayerRepository,
    } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    const result = await useCase.execute({
      characterCreationSessionId: creationSession.id,
      userId: 'user-1',
    });

    expect(result.character.name).toBe('Grognak');
    expect(result.character.hitPointsMax).toBe(35);
    expect(result.character.hitPointsCurrent).toBe(35);
    expect(result.character.inventory.map((i) => i.name).sort()).toEqual([
      'bouclier',
      'hache',
    ]);
    expect(result.character.customAttributes).toEqual({ strength: 16 });
    expect(result.character.sessionId).toBe('game-session-1');
    expect(result.character.ownerUserId).toBe('user-1');

    expect(result.sessionPlayer.sessionId).toBe('game-session-1');
    expect(result.sessionPlayer.userId).toBe('user-1');
    expect(result.sessionPlayer.characterId).toBe(result.character.id);

    const persistedPlayer = await sessionPlayerRepository.findBySessionAndUser(
      'game-session-1',
      'user-1',
    );
    expect(persistedPlayer).not.toBeNull();
    const persistedCharacter = await characterRepository.findById(
      result.character.id,
    );
    expect(persistedCharacter).not.toBeNull();

    const persistedCreationSession = await creationSessionRepository.findById(
      creationSession.id,
    );
    expect(persistedCreationSession?.status).toBe('completed');
  });

  it('falls back to schema defaults for fields the draft never set', async () => {
    const creationSession = buildCreationSession().appendExchange({
      userMessage: "Il s'appelle Grognak.",
      assistantMessage: 'Bien note.',
      draftUpdates: { name: 'Grognak' },
    });
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    const result = await useCase.execute({
      characterCreationSessionId: creationSession.id,
      userId: 'user-1',
    });

    expect(result.character.hitPointsMax).toBe(20);
    expect(result.character.inventory.map((i) => i.name)).toEqual(['torche']);
    expect(result.character.customAttributes).toEqual({ strength: 10 });
  });

  it('rejects finalizing a session that does not belong to the requesting user', async () => {
    const creationSession = buildCreationSession().appendExchange({
      userMessage: 'x',
      assistantMessage: 'y',
      draftUpdates: { name: 'Grognak' },
    });
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'someone-else',
      }),
    ).rejects.toThrow();
  });

  it('rejects finalizing an already-completed session', async () => {
    const creationSession = buildCreationSession()
      .appendExchange({
        userMessage: 'x',
        assistantMessage: 'y',
        draftUpdates: { name: 'Grognak' },
      })
      .complete();
    const { useCase } = buildUseCase({
      creationSessionRepository: new InMemoryCharacterCreationSessionRepository(
        [creationSession],
      ),
    });

    await expect(
      useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
      }),
    ).rejects.toThrow();
  });

  describe('opening narration trigger', () => {
    it('a solo session immediately triggers the opening narration on the only finalize', async () => {
      const creationSession = readyCreationSession('user-1', 'Grognak');
      const { useCase, llm, gameSessionRepository } = buildUseCase({
        creationSessionRepository:
          new InMemoryCharacterCreationSessionRepository([creationSession]),
      });

      await useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
      });

      expect(llm.narrateOpeningCallCount).toBe(1);
      const persisted = await gameSessionRepository.findById('game-session-1');
      expect(persisted?.openingNarrationText).toBe(
        'Le vent souffle sur les ruines de Karak-Dun...',
      );
    });

    it('a 3-player session does not trigger on the first two finalizes, only on the third and last', async () => {
      const session1 = readyCreationSession('user-1', 'Grognak');
      const session2 = readyCreationSession('user-2', 'Elara');
      const session3 = readyCreationSession('user-3', 'Thorin');
      const creationSessionRepository =
        new InMemoryCharacterCreationSessionRepository([
          session1,
          session2,
          session3,
        ]);
      const { useCase, llm, gameSessionRepository } = buildUseCase({
        creationSessionRepository,
      });

      await useCase.execute({
        characterCreationSessionId: session1.id,
        userId: 'user-1',
      });
      expect(llm.narrateOpeningCallCount).toBe(0);
      expect(
        (await gameSessionRepository.findById('game-session-1'))
          ?.openingNarrationText,
      ).toBeNull();

      await useCase.execute({
        characterCreationSessionId: session2.id,
        userId: 'user-2',
      });
      expect(llm.narrateOpeningCallCount).toBe(0);

      await useCase.execute({
        characterCreationSessionId: session3.id,
        userId: 'user-3',
      });
      expect(llm.narrateOpeningCallCount).toBe(1);
      expect(
        (await gameSessionRepository.findById('game-session-1'))
          ?.openingNarrationText,
      ).not.toBeNull();
    });

    it('still succeeds (character + session player created, creation session completed) when the quota is exhausted, and never calls the LLM', async () => {
      const creationSession = readyCreationSession('user-1', 'Grognak');
      const usageQuotaPort = new InMemoryUsageQuotaPort();
      usageQuotaPort.available = false;
      const {
        useCase,
        llm,
        gameSessionRepository,
        creationSessionRepository,
        sessionPlayerRepository,
      } = buildUseCase({
        creationSessionRepository:
          new InMemoryCharacterCreationSessionRepository([creationSession]),
        usageQuotaPort,
      });

      const result = await useCase.execute({
        characterCreationSessionId: creationSession.id,
        userId: 'user-1',
      });

      expect(result.character.name).toBe('Grognak');
      const persistedPlayer =
        await sessionPlayerRepository.findBySessionAndUser(
          'game-session-1',
          'user-1',
        );
      expect(persistedPlayer).not.toBeNull();
      const persistedCreationSession = await creationSessionRepository.findById(
        creationSession.id,
      );
      expect(persistedCreationSession?.status).toBe('completed');

      expect(llm.narrateOpeningCallCount).toBe(0);
      const persisted = await gameSessionRepository.findById('game-session-1');
      expect(persisted?.openingNarrationText).toBeNull();
    });

    it('does not re-trigger when a player joins and finalizes after the opening narration already fired', async () => {
      const firstCreationSession = readyCreationSession('user-1', 'Grognak');
      const creationSessionRepository =
        new InMemoryCharacterCreationSessionRepository([firstCreationSession]);
      const { useCase, llm, gameSessionRepository } = buildUseCase({
        creationSessionRepository,
      });

      await useCase.execute({
        characterCreationSessionId: firstCreationSession.id,
        userId: 'user-1',
      });
      expect(llm.narrateOpeningCallCount).toBe(1);

      const lateJoinerSession = readyCreationSession('user-2', 'Elara');
      await creationSessionRepository.save(lateJoinerSession);

      await useCase.execute({
        characterCreationSessionId: lateJoinerSession.id,
        userId: 'user-2',
      });

      expect(llm.narrateOpeningCallCount).toBe(1);
      const persisted = await gameSessionRepository.findById('game-session-1');
      expect(persisted?.openingNarrationText).toBe(
        'Le vent souffle sur les ruines de Karak-Dun...',
      );
    });
  });
});
