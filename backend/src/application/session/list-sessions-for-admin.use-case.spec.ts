import { Character } from '../../domain/character/character';
import { CharacterRepository } from '../../domain/character/character.repository';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { ListSessionsForAdminUseCase } from './list-sessions-for-admin.use-case';

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

function buildGameSystem(id: string, name: string): GameSystem {
  return GameSystem.create({
    id,
    name,
    description: '',
    adaptedForChildren: false,
    rulesText: '',
    rulesSourceFileName: `${id}.pdf`,
    characterSheetSchema: CHARACTER_SHEET_SCHEMA,
    mechanicalActions: [],
  });
}

function buildCharacter(
  id: string,
  sessionId: string,
  ownerUserId: string,
  name: string,
): Character {
  return Character.create({
    id,
    gameSystemId: 'irrelevant-for-this-test',
    sessionId,
    ownerUserId,
    name,
    hitPointsMax: 20,
    hitPointsCurrent: 20,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ListSessionsForAdminUseCase', () => {
  it('returns every session in the system with the correct game system name and participants, across different game systems and participant counts', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([
      buildGameSystem('game-system-dnd', 'Donjons & Dragons'),
      buildGameSystem('game-system-coc', "L'Appel de Cthulhu"),
    ]);

    const soloSession = GameSession.create({
      id: 'session-solo',
      gameSystemId: 'game-system-dnd',
      name: 'Aventure en solo',
      inviteCode: 'AAAA11',
      createdByUserId: 'user-gm',
    });
    const groupSession = GameSession.create({
      id: 'session-group',
      gameSystemId: 'game-system-coc',
      name: 'Enquete a Arkham',
      inviteCode: 'BBBB22',
      createdByUserId: 'user-host',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([
      soloSession,
      groupSession,
    ]);

    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: 'session-solo',
        userId: 'user-gm',
        characterId: 'character-1',
      }),
      SessionPlayer.create({
        sessionId: 'session-group',
        userId: 'user-host',
        characterId: 'character-2',
      }),
      SessionPlayer.create({
        sessionId: 'session-group',
        userId: 'user-guest',
        characterId: 'character-3',
      }),
    ]);

    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-1', 'session-solo', 'user-gm', 'Solo Hero'),
      buildCharacter(
        'character-2',
        'session-group',
        'user-host',
        'Investigateur A',
      ),
      buildCharacter(
        'character-3',
        'session-group',
        'user-guest',
        'Investigateur B',
      ),
    ]);

    const useCase = new ListSessionsForAdminUseCase(
      gameSessionRepository,
      gameSystemRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const result = await useCase.execute();

    expect(result).toHaveLength(2);

    const solo = result.find((s) => s.id === 'session-solo');
    expect(solo).toMatchObject({
      name: 'Aventure en solo',
      gameSystemName: 'Donjons & Dragons',
    });
    expect(solo?.participants).toHaveLength(1);
    expect(solo?.participants[0]).toMatchObject({
      userId: 'user-gm',
      characterName: 'Solo Hero',
    });

    const group = result.find((s) => s.id === 'session-group');
    expect(group).toMatchObject({
      name: 'Enquete a Arkham',
      gameSystemName: "L'Appel de Cthulhu",
    });
    expect(group?.participants).toHaveLength(2);
    expect(group?.participants.map((p) => p.characterName).sort()).toEqual([
      'Investigateur A',
      'Investigateur B',
    ]);
  });

  it('falls back to placeholder labels when a referenced game system or character cannot be resolved', async () => {
    const gameSystemRepository = new InMemoryGameSystemRepository([]);
    const session = GameSession.create({
      id: 'session-orphan',
      gameSystemId: 'missing-game-system',
      name: 'Partie orpheline',
      inviteCode: 'CCCC33',
      createdByUserId: 'user-1',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: 'session-orphan',
        userId: 'user-1',
        characterId: 'missing-character',
      }),
    ]);
    const characterRepository: CharacterRepository =
      new InMemoryCharacterRepository([]);

    const useCase = new ListSessionsForAdminUseCase(
      gameSessionRepository,
      gameSystemRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const [view] = await useCase.execute();

    expect(view.gameSystemName).toBe('JdR inconnu');
    expect(view.participants[0].characterName).toBe('Personnage inconnu');
  });
});
