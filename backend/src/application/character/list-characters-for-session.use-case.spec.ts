import { Character } from '../../domain/character/character';
import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { InMemoryCharacterRepository } from './in-memory-character.repository';
import { ListCharactersForSessionUseCase } from './list-characters-for-session.use-case';

const schema: CharacterSheetSchema = {
  baseAttributes: { hitPoints: { max: 20 }, inventory: [] },
  customAttributes: [],
};

function makeCharacter(
  id: string,
  sessionId: string,
  ownerUserId: string,
): Character {
  return Character.fromSchema({
    id,
    gameSystemId: 'game-system-1',
    sessionId,
    ownerUserId,
    name: `Character ${id}`,
    schema,
    now: new Date('2026-01-01'),
  });
}

function buildSession(charactersVisibleToOthers: boolean) {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
    charactersVisibleToOthers,
  });
}

describe('ListCharactersForSessionUseCase', () => {
  it('returns every character of a visible session', async () => {
    const session = buildSession(true);
    const characterRepository = new InMemoryCharacterRepository([
      makeCharacter('char-1', session.id, 'user-1'),
      makeCharacter('char-2', session.id, 'user-2'),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-1',
        characterId: 'char-1',
      }),
    ]);
    const useCase = new ListCharactersForSessionUseCase(
      characterRepository,
      gameSessionRepository,
      sessionPlayerRepository,
    );

    const characters = await useCase.execute(session.id, 'user-1');

    expect(characters.map((c) => c.id).sort()).toEqual(['char-1', 'char-2']);
  });

  it("returns only the requester's own character(s) of a hidden session", async () => {
    const session = buildSession(false);
    const characterRepository = new InMemoryCharacterRepository([
      makeCharacter('char-1', session.id, 'user-1'),
      makeCharacter('char-2', session.id, 'user-2'),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-1',
        characterId: 'char-1',
      }),
    ]);
    const useCase = new ListCharactersForSessionUseCase(
      characterRepository,
      gameSessionRepository,
      sessionPlayerRepository,
    );

    const characters = await useCase.execute(session.id, 'user-1');

    expect(characters.map((c) => c.id)).toEqual(['char-1']);
  });

  it('rejects a requester who is not an active player of the session', async () => {
    const session = buildSession(true);
    const characterRepository = new InMemoryCharacterRepository([
      makeCharacter('char-1', session.id, 'user-1'),
    ]);
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const useCase = new ListCharactersForSessionUseCase(
      characterRepository,
      gameSessionRepository,
      new InMemorySessionPlayerRepository(),
    );

    await expect(useCase.execute(session.id, 'not-a-player')).rejects.toThrow();
  });

  it('throws when the session does not exist', async () => {
    const useCase = new ListCharactersForSessionUseCase(
      new InMemoryCharacterRepository(),
      new InMemoryGameSessionRepository(),
      new InMemorySessionPlayerRepository(),
    );

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow();
  });
});
