import { CharacterCreationSession } from '../../domain/character-creation/character-creation-session';
import { InMemoryCharacterCreationSessionRepository } from '../character-creation/in-memory-character-creation-session.repository';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { JoinSessionUseCase } from './join-session.use-case';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';

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

  async deleteById(id: string): Promise<void> {
    this.gameSystems = this.gameSystems.filter((g) => g.id !== id);
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
  it('lets a second user join with the invite code, starting their character-creation conversation', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem(),
    ]);
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository();
    const useCase = new JoinSessionUseCase(
      gameSessionRepository,
      gameSystemRepository,
      characterCreationSessionRepository,
    );

    const { characterCreationSessionId } = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
    });

    const creationSession = await characterCreationSessionRepository.findById(
      characterCreationSessionId,
    );
    expect(creationSession?.gameSessionId).toBe(session.id);
    expect(creationSession?.userId).toBe('user-2');
    expect(creationSession?.status).toBe('in_progress');
  });

  it('accepts an invite code regardless of casing', async () => {
    const session = buildSession();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'xk4r2p',
        userId: 'user-2',
        userRole: 'adult',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown invite code', async () => {
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository(),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'NOPE12',
        userId: 'user-2',
        userRole: 'adult',
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
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'XK4R2P',
        userId: 'child-1',
        userRole: 'child',
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
      new InMemoryCharacterCreationSessionRepository(),
    );

    await expect(
      useCase.execute({
        inviteCode: 'XK4R2P',
        userId: 'child-1',
        userRole: 'child',
      }),
    ).resolves.toBeDefined();
  });

  it('is idempotent: re-joining an already-mid-creation user returns the SAME creation session, never a duplicate', async () => {
    const session = buildSession();
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository();
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      characterCreationSessionRepository,
    );

    const first = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
    });
    const second = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
    });

    expect(second.characterCreationSessionId).toBe(
      first.characterCreationSessionId,
    );
  });

  it('is idempotent: re-joining an already-finalized (seated) user returns their completed creation session, never starts a new one', async () => {
    const session = buildSession();
    const finalizedCreationSession = CharacterCreationSession.create({
      gameSessionId: session.id,
      gameSystemId: 'game-system-1',
      userId: 'user-2',
    })
      .appendExchange({
        userMessage: 'Legolas',
        assistantMessage: 'Ok',
        draftUpdates: { name: 'Legolas' },
      })
      .complete();
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository([
        finalizedCreationSession,
      ]);
    const useCase = new JoinSessionUseCase(
      new InMemoryGameSessionRepository([session]),
      new InMemoryGameSystemRepository([buildGameSystem()]),
      characterCreationSessionRepository,
    );

    const result = await useCase.execute({
      inviteCode: 'XK4R2P',
      userId: 'user-2',
      userRole: 'adult',
    });

    expect(result.characterCreationSessionId).toBe(finalizedCreationSession.id);
  });
});
