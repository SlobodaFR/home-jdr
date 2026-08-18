import { Character } from '../../domain/character/character';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { GetCharacterUseCase } from './get-character.use-case';
import { InMemoryCharacterRepository } from './in-memory-character.repository';

const schema: CharacterSheetSchema = {
  baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
  customAttributes: [],
};

function buildSession(charactersVisibleToOthers: boolean) {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
    charactersVisibleToOthers,
  });
}

describe('GetCharacterUseCase', () => {
  it('always allows the owner to fetch their own character', async () => {
    const session = buildSession(false);
    const character = Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: session.id,
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
    const characterRepository = new InMemoryCharacterRepository([character]);
    const useCase = new GetCharacterUseCase(
      characterRepository,
      new InMemoryGameSessionRepository([session]),
      new InMemorySessionPlayerRepository(),
    );

    await expect(useCase.execute('char-1', 'user-1')).resolves.toBe(character);
  });

  it('allows another active player to fetch a character when the session is visible', async () => {
    const session = buildSession(true);
    const character = Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: session.id,
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
    const characterRepository = new InMemoryCharacterRepository([character]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-2',
        characterId: 'char-other',
      }),
    ]);
    const useCase = new GetCharacterUseCase(
      characterRepository,
      new InMemoryGameSessionRepository([session]),
      sessionPlayerRepository,
    );

    await expect(useCase.execute('char-1', 'user-2')).resolves.toBe(character);
  });

  it('rejects another player fetching a character when the session is hidden', async () => {
    const session = buildSession(false);
    const character = Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: session.id,
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
    const characterRepository = new InMemoryCharacterRepository([character]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-2',
        characterId: 'char-other',
      }),
    ]);
    const useCase = new GetCharacterUseCase(
      characterRepository,
      new InMemoryGameSessionRepository([session]),
      sessionPlayerRepository,
    );

    await expect(useCase.execute('char-1', 'user-2')).rejects.toThrow();
  });

  it('rejects a non-player from fetching another character even in a visible session', async () => {
    const session = buildSession(true);
    const character = Character.fromSchema({
      id: 'char-1',
      gameSystemId: 'game-system-1',
      sessionId: session.id,
      ownerUserId: 'user-1',
      name: 'Aragorn',
      schema,
      now: new Date('2026-01-01'),
    });
    const characterRepository = new InMemoryCharacterRepository([character]);
    const useCase = new GetCharacterUseCase(
      characterRepository,
      new InMemoryGameSessionRepository([session]),
      new InMemorySessionPlayerRepository(),
    );

    await expect(useCase.execute('char-1', 'stranger')).rejects.toThrow();
  });

  it('throws NotFoundException when the character does not exist', async () => {
    const useCase = new GetCharacterUseCase(
      new InMemoryCharacterRepository(),
      new InMemoryGameSessionRepository(),
      new InMemorySessionPlayerRepository(),
    );

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow();
  });
});
