import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { JoinSessionUseCase } from './join-session.use-case';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';

class InMemoryGameSystemRepository extends GameSystemRepository {
  constructor(private gameSystems: GameSystem[] = []) {
    super();
  }

  async findById(id: string): Promise<GameSystem | null> {
    return this.gameSystems.find((g) => g.id === id) ?? null;
  }

  async findAll(filter?: GameSystemListFilter): Promise<GameSystem[]> {
    return filter?.childSafeOnly
      ? this.gameSystems.filter((g) => g.adaptedForChildren)
      : this.gameSystems;
  }

  async save(gameSystem: GameSystem): Promise<void> {
    this.gameSystems = [
      ...this.gameSystems.filter((g) => g.id !== gameSystem.id),
      gameSystem,
    ];
  }
}

const CHARACTER_SHEET_SCHEMA: CharacterSheetSchema = {
  hitPoints: { defaultMax: 20 },
  inventory: { defaultItems: [] },
  customAttributes: [],
};

function buildGameSystem(
  overrides: Partial<{ adaptedForChildren: boolean }> = {},
) {
  return GameSystem.create({
    id: 'game-system-1',
    name: 'Donjons & Dragons',
    description: 'JdR de fantasy',
    adaptedForChildren: overrides.adaptedForChildren ?? false,
    rulesText: 'texte',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: CHARACTER_SHEET_SCHEMA,
    mechanicalActions: [],
  });
}

function buildSession(overrides: Partial<{ gameSystemId: string }> = {}) {
  return GameSession.create({
    gameSystemId: overrides.gameSystemId ?? 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

describe('JoinSessionUseCase', () => {
  it('lets a second user join with the invite code, creating their character and seat', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem(),
    ]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository();
    const characterRepository = new InMemoryCharacterRepository();
    const useCase = new JoinSessionUseCase(
      gameSessionRepository,
      gameSystemRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const { character } = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
      characterName: 'Legolas',
    });

    expect(character.sessionId).toBe(session.id);
    const player = await sessionPlayerRepository.findBySessionAndUser(
      session.id,
      'user-2',
    );
    expect(player?.characterId).toBe(character.id);
  });

  it('accepts an invite code regardless of casing', async () => {
    const session = buildSession();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'xk4r2p',
        userId: 'user-2',
        userRole: 'adult',
        characterName: 'Legolas',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown invite code', async () => {
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository(),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'NOPE12',
        userId: 'user-2',
        userRole: 'adult',
        characterName: 'Legolas',
      }),
    ).rejects.toThrow();
  });

  it('rejects a child account joining a session whose JdR is not adapted for children, with a clear message', async () => {
    const session = buildSession();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([
        buildGameSystem({ adaptedForChildren: false }),
      ]),
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'XK4R2P',
        userId: 'child-1',
        userRole: 'child',
        characterName: 'Petit hero',
      }),
    ).rejects.toThrow(/enfant/);
  });

  it('allows a child account to join a session whose JdR is adapted for children', async () => {
    const session = buildSession();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([
        buildGameSystem({ adaptedForChildren: true }),
      ]),
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'XK4R2P',
        userId: 'child-1',
        userRole: 'child',
        characterName: 'Petit hero',
      }),
    ).resolves.toBeDefined();
  });

  it('is idempotent: re-joining an already-seated user returns the existing seat', async () => {
    const session = buildSession();
    const sessionPlayerRepository = new InMemorySessionPlayerRepository();
    const characterRepository = new InMemoryCharacterRepository();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      sessionPlayerRepository,
      characterRepository,
    );

    const first = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
      characterName: 'Legolas',
    });
    const second = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
      characterName: 'Legolas (nouvelle tentative)',
    });

    expect(second.character.id).toBe(first.character.id);
    const players = await sessionPlayerRepository.findBySessionId(session.id);
    expect(players).toHaveLength(1);
  });
});
