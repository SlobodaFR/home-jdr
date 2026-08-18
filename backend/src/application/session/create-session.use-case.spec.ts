import { InMemoryCharacterCreationSessionRepository } from '../character-creation/in-memory-character-creation-session.repository';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { InviteCodeGeneratorPort } from '../../domain/session/invite-code-generator.port';
import { CreateSessionUseCase } from './create-session.use-case';
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

/** Deterministic - the first N.entries() call returns the queued codes in order. */
class QueuedInviteCodeGenerator extends InviteCodeGeneratorPort {
  constructor(private readonly codes: string[]) {
    super();
  }

  generate(): string {
    const code = this.codes.shift();
    if (!code) {
      throw new Error('QueuedInviteCodeGenerator ran out of codes');
    }
    return code;
  }
}

const CHARACTER_SHEET_SCHEMA: CharacterSheetSchema = {
  hitPoints: { defaultMax: 20 },
  inventory: { defaultItems: ['torche'] },
  customAttributes: [
    { key: 'strength', label: 'Force', type: 'number', default: 10 },
  ],
};

function buildGameSystem(
  overrides: Partial<{ adaptedForChildren: boolean }> = {},
) {
  return GameSystem.create({
    id: 'game-system-1',
    name: 'Donjons & Dragons',
    description: 'JdR de fantasy',
    adaptedForChildren: overrides.adaptedForChildren ?? false,
    rulesText: 'texte des regles',
    rulesSourceFileName: 'rules.pdf',
    characterSheetSchema: CHARACTER_SHEET_SCHEMA,
    mechanicalActions: [],
  });
}

describe('CreateSessionUseCase', () => {
  it("creates the session, generates an invite code, and starts (but does not finalize) the creator's character-creation conversation", async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem(),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository();
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository();
    const useCase = new CreateSessionUseCase(
      gameSessionRepository,
      gameSystemRepository,
      characterCreationSessionRepository,
      new QueuedInviteCodeGenerator(['XK4R2P']),
    );

    const { session, characterCreationSessionId } = await useCase.execute({
      gameSystemId: 'game-system-1',
      name: 'La quete du dragon',
      createdByUserId: 'user-1',
      createdByUserRole: 'adult',
      charactersVisibleToOthers: true,
    });

    expect(session.inviteCode).toBe('XK4R2P');
    expect(session.status).toBe('waiting_for_players');
    expect(session.charactersVisibleToOthers).toBe(true);

    const creationSession = await characterCreationSessionRepository.findById(
      characterCreationSessionId,
    );
    expect(creationSession).not.toBeNull();
    expect(creationSession?.gameSessionId).toBe(session.id);
    expect(creationSession?.userId).toBe('user-1');
    expect(creationSession?.status).toBe('in_progress');
  });

  it('does not create a SessionPlayer synchronously - the creator only becomes active once they finalize', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem(),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository();
    const characterCreationSessionRepository =
      new InMemoryCharacterCreationSessionRepository();
    const useCase = new CreateSessionUseCase(
      gameSessionRepository,
      gameSystemRepository,
      characterCreationSessionRepository,
      new QueuedInviteCodeGenerator(['XK4R2P']),
    );

    const { characterCreationSessionId } = await useCase.execute({
      gameSystemId: 'game-system-1',
      name: 'La quete du dragon',
      createdByUserId: 'user-1',
      createdByUserRole: 'adult',
      charactersVisibleToOthers: false,
    });

    const creationSession = await characterCreationSessionRepository.findById(
      characterCreationSessionId,
    );
    expect(creationSession?.status).toBe('in_progress');
  });

  it('retries invite code generation until a unique one is found', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem(),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository();
    const useCase = new CreateSessionUseCase(
      gameSessionRepository,
      gameSystemRepository,
      new InMemoryCharacterCreationSessionRepository(),
      new QueuedInviteCodeGenerator(['DUPE1', 'DUPE1', 'FRESH1']),
    );
    await useCase.execute({
      gameSystemId: 'game-system-1',
      name: 'Premiere partie',
      createdByUserId: 'user-1',
      createdByUserRole: 'adult',
      charactersVisibleToOthers: false,
    });

    const { session } = await useCase.execute({
      gameSystemId: 'game-system-1',
      name: 'Deuxieme partie',
      createdByUserId: 'user-2',
      createdByUserRole: 'adult',
      charactersVisibleToOthers: false,
    });

    expect(session.inviteCode).toBe('FRESH1');
  });

  it('rejects a child account creating a session on a JdR not adapted for children', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem({ adaptedForChildren: false }),
    ]);
    const useCase = new CreateSessionUseCase(
      new InMemoryGameSessionRepository(),
      gameSystemRepository,
      new InMemoryCharacterCreationSessionRepository(),
      new QueuedInviteCodeGenerator(['XK4R2P']),
    );

    await expect(
      useCase.execute({
        gameSystemId: 'game-system-1',
        name: 'La quete du dragon',
        createdByUserId: 'child-1',
        createdByUserRole: 'child',
        charactersVisibleToOthers: false,
      }),
    ).rejects.toThrow(/enfant/);
  });

  it('allows a child account to create a session on a JdR adapted for children', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem({ adaptedForChildren: true }),
    ]);
    const useCase = new CreateSessionUseCase(
      new InMemoryGameSessionRepository(),
      gameSystemRepository,
      new InMemoryCharacterCreationSessionRepository(),
      new QueuedInviteCodeGenerator(['XK4R2P']),
    );

    await expect(
      useCase.execute({
        gameSystemId: 'game-system-1',
        name: 'La quete du dragon',
        createdByUserId: 'child-1',
        createdByUserRole: 'child',
        charactersVisibleToOthers: false,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown gameSystemId', async () => {
    const useCase = new CreateSessionUseCase(
      new InMemoryGameSessionRepository(),
      new InMemoryGameSystemRepository(),
      new InMemoryCharacterCreationSessionRepository(),
      new QueuedInviteCodeGenerator(['XK4R2P']),
    );

    await expect(
      useCase.execute({
        gameSystemId: 'unknown',
        name: 'La quete du dragon',
        createdByUserId: 'user-1',
        createdByUserRole: 'adult',
        charactersVisibleToOthers: false,
      }),
    ).rejects.toThrow();
  });
});
