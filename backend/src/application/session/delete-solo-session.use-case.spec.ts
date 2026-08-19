import { Character } from '../../domain/character/character';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { InMemoryCharacterCreationSessionRepository } from '../character-creation/in-memory-character-creation-session.repository';
import { InMemoryCharacterRepository } from '../character/in-memory-character.repository';
import { InMemoryPendingCharacterDeltaRepository } from '../character/in-memory-pending-character-delta.repository';
import { InMemoryMapPinRepository } from '../world-map/in-memory-map-pin.repository';
import { InMemoryWorldMapRepository } from '../world-map/in-memory-world-map.repository';
import { DeleteSessionCascade } from './delete-session-cascade';
import { DeleteSoloSessionUseCase } from './delete-solo-session.use-case';
import { InMemoryGameSessionRepository } from './in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from './in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from './in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from './in-memory-turn-submission.repository';

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
  characterRepository = new InMemoryCharacterRepository(),
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
  return new DeleteSoloSessionUseCase(
    gameSessionRepository,
    sessionPlayerRepository,
    cascade,
  );
}

describe('DeleteSoloSessionUseCase', () => {
  it('deletes a solo session (one active player) when requested by that player', async () => {
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

    await useCase.execute({ sessionId: session.id, userId: 'user-1' });

    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.toBeNull();
    await expect(
      characterRepository.findById('character-1'),
    ).resolves.toBeNull();
  });

  it('deletes an unclaimed session (zero active players) when requested by its creator', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([]);
    const useCase = buildUseCase(gameSessionRepository, sessionPlayerRepository);

    await useCase.execute({ sessionId: session.id, userId: 'user-1' });

    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.toBeNull();
  });

  it('rejects deletion of an unclaimed session (zero active players) by a non-creator', async () => {
    const session = buildSession();
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([]);
    const useCase = buildUseCase(gameSessionRepository, sessionPlayerRepository);

    await expect(
      useCase.execute({ sessionId: session.id, userId: 'intruder' }),
    ).rejects.toThrow();
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
  });

  it('rejects deletion of a session with 2+ active players, even by one of them', async () => {
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
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
    );

    await expect(
      useCase.execute({ sessionId: session.id, userId: 'user-1' }),
    ).rejects.toThrow();
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
  });

  it('rejects deletion by a non-player of a solo session', async () => {
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
    const useCase = buildUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
    );

    await expect(
      useCase.execute({ sessionId: session.id, userId: 'intruder' }),
    ).rejects.toThrow();
    await expect(
      gameSessionRepository.findById(session.id),
    ).resolves.not.toBeNull();
  });

  it('rejects deletion of an unknown session', async () => {
    const useCase = buildUseCase(
      new InMemoryGameSessionRepository(),
      new InMemorySessionPlayerRepository(),
    );

    await expect(
      useCase.execute({ sessionId: 'nope', userId: 'user-1' }),
    ).rejects.toThrow();
  });
});
