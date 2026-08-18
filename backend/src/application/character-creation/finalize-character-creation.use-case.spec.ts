import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { GameSystem } from '../../domain/game-system/game-system';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryGameSystemRepository } from '../game-system/in-memory-game-system.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { FinalizeCharacterCreationUseCase } from './finalize-character-creation.use-case';
import { InMemoryCharacterCreationSessionRepository } from './in-memory-character-creation-session.repository';

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

function buildCreationSession() {
  return CharacterCreationSession.create({
    gameSessionId: 'game-session-1',
    gameSystemId: 'game-system-1',
    userId: 'user-1',
  });
}

describe('FinalizeCharacterCreationUseCase', () => {
  function buildUseCase(
    overrides: {
      creationSessionRepository?: InMemoryCharacterCreationSessionRepository;
      gameSystemRepository?: InMemoryGameSystemRepository;
      characterRepository?: InMemoryCharacterRepository;
      sessionPlayerRepository?: InMemorySessionPlayerRepository;
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

    const useCase = new FinalizeCharacterCreationUseCase(
      creationSessionRepository,
      gameSystemRepository,
      characterRepository,
      sessionPlayerRepository,
    );

    return {
      useCase,
      creationSessionRepository,
      characterRepository,
      sessionPlayerRepository,
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
});
