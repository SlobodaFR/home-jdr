import { SessionPlayer } from './session-player';

describe('SessionPlayer', () => {
  it('defaults joinedAt to now when not provided', () => {
    const before = new Date();

    const player = SessionPlayer.create({
      sessionId: 'session-1',
      userId: 'user-1',
      characterId: 'character-1',
    });

    expect(player.joinedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('rejects a blank sessionId', () => {
    expect(() =>
      SessionPlayer.create({
        sessionId: '   ',
        userId: 'user-1',
        characterId: 'character-1',
      }),
    ).toThrow();
  });

  it('rejects a blank userId', () => {
    expect(() =>
      SessionPlayer.create({
        sessionId: 'session-1',
        userId: '   ',
        characterId: 'character-1',
      }),
    ).toThrow();
  });

  it('rejects a blank characterId', () => {
    expect(() =>
      SessionPlayer.create({
        sessionId: 'session-1',
        userId: 'user-1',
        characterId: '   ',
      }),
    ).toThrow();
  });
});
