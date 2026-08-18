import { GameSession } from './game-session';

describe('GameSession', () => {
  function createSession() {
    return GameSession.create({
      gameSystemId: 'game-system-1',
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
  }

  describe('create', () => {
    it('starts waiting_for_players at turn 1 with an empty rolling summary', () => {
      const session = createSession();

      expect(session.status).toBe('waiting_for_players');
      expect(session.currentTurnNumber).toBe(1);
      expect(session.rollingSummary).toBe('');
    });

    it('rejects a blank name', () => {
      expect(() =>
        GameSession.create({
          gameSystemId: 'game-system-1',
          name: '   ',
          inviteCode: 'XK4R2P',
          createdByUserId: 'user-1',
        }),
      ).toThrow();
    });

    it('rejects a blank invite code', () => {
      expect(() =>
        GameSession.create({
          gameSystemId: 'game-system-1',
          name: 'La quete du dragon',
          inviteCode: '   ',
          createdByUserId: 'user-1',
        }),
      ).toThrow();
    });
  });

  describe('turn lifecycle', () => {
    it('transitions waiting_for_players -> resolving -> narrating -> waiting_for_players', () => {
      const session = createSession();

      const resolving = session.beginResolving();
      expect(resolving.status).toBe('resolving');

      const narrating = resolving.completeResolution();
      expect(narrating.status).toBe('narrating');
      expect(narrating.currentTurnNumber).toBe(1);

      const nextTurn = narrating.startNextTurn();
      expect(nextTurn.status).toBe('waiting_for_players');
      expect(nextTurn.currentTurnNumber).toBe(2);
    });

    it('rejects beginResolving from a status other than waiting_for_players', () => {
      const session = createSession().beginResolving();

      expect(() => session.beginResolving()).toThrow();
    });

    it('rejects completeResolution from a status other than resolving', () => {
      const session = createSession();

      expect(() => session.completeResolution()).toThrow();
    });

    it('rejects startNextTurn from a status other than narrating', () => {
      const session = createSession();

      expect(() => session.startNextTurn()).toThrow();
    });
  });

  describe('updateRollingSummary', () => {
    it('replaces the rolling summary without touching status or turn number', () => {
      const session = createSession().beginResolving();

      const updated = session.updateRollingSummary(
        'Les héros ont fui le donjon.',
      );

      expect(updated.rollingSummary).toBe('Les héros ont fui le donjon.');
      expect(updated.status).toBe('resolving');
      expect(updated.currentTurnNumber).toBe(1);
    });
  });
});
