import { Character } from '../../domain/character/character';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryCharacterCreationSessionRepository } from '../character-creation/in-memory-character-creation-session.repository';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from '../character/in-memory-pending-character-delta.repository';
import { InMemoryMapPinRepository } from '../world-map/in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from '../world-map/in-memory-world-map.repository';
import { DeleteSessionCascade } from './delete-session-cascade';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';
import { LeaveSessionUseCase } from './leave-session.use-case';

function buildSession() {
  return GameSession.create({
    gameSystemId: 'game-system-1',
    name: 'La quete du dragon',
    inviteCode: 'XK4R2P',
    createdByUserId: 'user-1',
  });
}

function buildCharacter(id: string, sessionId: string, ownerUserId: string) {
  return Character.create({
    id,
    gameSystemId: 'game-system-1',
    sessionId,
    ownerUserId,
    name: `Perso ${id}`,
    hitPointsMax: 20,
    hitPointsCurrent: 20,
    inventory: [],
    customAttributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildUseCase(
  gameSessionRepository: InMemoryGameSessionRepository,
  sessionPlayerRepository: InMemorySessionPlayerRepository,
  characterRepository: InMemoryCharacterRepository,
) {
  const cascade = new DeleteSessionCascade(
    gameSessionRepository,
    sessionPlayerRepository,
    characterRepository,
    new InMemoryTurnSubmissionRepository(),
    new InMemoryTurnResolutionRepository(),
    new InMemoryPendingCharacterDeltaRepository(),
    new InMemoryWorldMapRepository(),
    new InMemoryMapPinRepository(),
    new InMemoryCharacterCreationSessionRepository(),
  );
  return new LeaveSessionUseCase(
    gameSessionRepository,
    sessionPlayerRepository,
    characterRepository,
    cascade,
  );
}

describe('LeaveSessionUseCase', () => {
  it('in a 3-player session, one player leaving removes only their own SessionPlayer + Character, leaves the session and the other 2 players fully intact', async () => {
    const session = buildSession();
    const playerOne = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-1',
      characterId: 'character-1',
    });
    const playerTwo = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-2',
      characterId: 'character-2',
    });
    const playerThree = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-3',
      characterId: 'character-3',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      playerOne,
      playerTwo,
      playerThree,
    ]);
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-1', session.id, 'user-1'),
      buildCharacter('character-2', session.id, 'user-2'),
      buildCharacter('character-3', session.id, 'user-3'),
    ]);
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const result = await useCase.execute({
      sessionId: session.id,
      userId: 'user-2',
    });

    expect(result.sessionDeleted).toBe(false);
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
    await expect(
      sessionPlayerRepository.findBySessionAndUser(session.id, 'user-2'),
    ).resolves.toBeNull();
    await expect(
      characterRepository.findById('character-2'),
    ).resolves.toBeNull();

    const remaining = await sessionPlayerRepository.findBySessionId(session.id);
    expect(remaining.map((p) => p.userId).sort()).toEqual(['user-1', 'user-3']);
    await expect(
      characterRepository.findById('character-1'),
    ).resolves.not.toBeNull();
    await expect(
      characterRepository.findById('character-3'),
    ).resolves.not.toBeNull();
  });

  it('in a 2-player session, the second-to-last player leaving reduces it to 1 active player and does NOT delete the session', async () => {
    const session = buildSession();
    const playerOne = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-1',
      characterId: 'character-1',
    });
    const playerTwo = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-2',
      characterId: 'character-2',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      playerOne,
      playerTwo,
    ]);
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-1', session.id, 'user-1'),
      buildCharacter('character-2', session.id, 'user-2'),
    ]);
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const result = await useCase.execute({
      sessionId: session.id,
      userId: 'user-2',
    });

    expect(result.sessionDeleted).toBe(false);
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
    const remaining = await sessionPlayerRepository.findBySessionId(session.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].userId).toBe('user-1');
  });

  it('the LAST active player leaving deletes the entire session and everything scoped to it, same cascade as solo-delete', async () => {
    const session = buildSession();
    const player = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-1',
      characterId: 'character-1',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      player,
    ]);
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-1', session.id, 'user-1'),
    ]);
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    const result = await useCase.execute({
      sessionId: session.id,
      userId: 'user-1',
    });

    expect(result.sessionDeleted).toBe(true);
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.toBeNull();
    await expect(
      characterRepository.findById('character-1'),
    ).resolves.toBeNull();
    await expect(
      sessionPlayerRepository.findBySessionId(session.id),
    ).resolves.toEqual([]);
  });

  it('rejects a non-player leaving a session (403)', async () => {
    const session = buildSession();
    const player = SessionPlayer.create({
      sessionId: session.id,
      userId: 'user-1',
      characterId: 'character-1',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      player,
    ]);
    const characterRepository = new InMemoryCharacterRepository([
      buildCharacter('character-1', session.id, 'user-1'),
    ]);
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      characterRepository,
    );

    await expect(
      useCase.execute({ sessionId: session.id, userId: 'intruder' }),
    ).rejects.toThrow();
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
    await expect(
      sessionPlayerRepository.findBySessionAndUser(session.id, 'user-1'),
    ).resolves.not.toBeNull();
  });

  it('rejects leaving an unknown session', async () => {
    const useCase = buildUseCase(
      new InMemoryGameSessionRepository(),
      new InMemorySessionPlayerRepository(),
      new InMemoryCharacterRepository(),
    );

    await expect(
      useCase.execute({ sessionId: 'nope', userId: 'user-1' }),
    ).rejects.toThrow();
  });
});
