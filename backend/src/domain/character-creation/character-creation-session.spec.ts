import { CharacterCreationSession } from './character-creation-session';

describe('CharacterCreationSession', () => {
  function createSession() {
    return CharacterCreationSession.create({
      gameSessionId: 'session-1',
      gameSystemId: 'game-system-1',
      userId: 'user-1',
    });
  }

  describe('create', () => {
    it('starts in_progress, seeded with a single static opening assistant message', () => {
      const session = createSession();

      expect(session.status).toBe('in_progress');
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe('assistant');
      expect(session.messages[0].content.length).toBeGreaterThan(0);
    });

    it('starts with an empty draft character', () => {
      const session = createSession();

      expect(session.draftCharacter).toEqual({});
    });

    it('rejects a blank gameSessionId, gameSystemId or userId', () => {
      expect(() =>
        CharacterCreationSession.create({
          gameSessionId: '   ',
          gameSystemId: 'game-system-1',
          userId: 'user-1',
        }),
      ).toThrow();
      expect(() =>
        CharacterCreationSession.create({
          gameSessionId: 'session-1',
          gameSystemId: '   ',
          userId: 'user-1',
        }),
      ).toThrow();
      expect(() =>
        CharacterCreationSession.create({
          gameSessionId: 'session-1',
          gameSystemId: 'game-system-1',
          userId: '   ',
        }),
      ).toThrow();
    });
  });

  describe('appendExchange', () => {
    it('appends the user message then the assistant reply, in order', () => {
      const session = createSession();

      const updated = session.appendExchange({
        userMessage: 'Je veux jouer un nain guerrier.',
        assistantMessage: 'Quel est son nom ?',
      });

      expect(updated.messages.slice(1)).toEqual([
        { role: 'user', content: 'Je veux jouer un nain guerrier.' },
        { role: 'assistant', content: 'Quel est son nom ?' },
      ]);
    });

    it('merges draft updates without touching fields absent from the update (non-destructive)', () => {
      const session = createSession().appendExchange({
        userMessage: 'Il porte une hache.',
        assistantMessage: 'Bien note.',
        draftUpdates: { name: 'Grognak', inventory: ['hache'] },
      });

      const updated = session.appendExchange({
        userMessage: 'Il a 30 points de vie.',
        assistantMessage: 'Bien note.',
        draftUpdates: { hitPointsMax: 30 },
      });

      expect(updated.draftCharacter).toEqual({
        name: 'Grognak',
        inventory: ['hache'],
        hitPointsMax: 30,
      });
    });

    it('shallow-merges customAttributes updates per key, keeping previously set keys', () => {
      const session = createSession().appendExchange({
        userMessage: 'Force 12.',
        assistantMessage: 'Bien note.',
        draftUpdates: { customAttributes: { strength: 12 } },
      });

      const updated = session.appendExchange({
        userMessage: 'Agilite 8.',
        assistantMessage: 'Bien note.',
        draftUpdates: { customAttributes: { agility: 8 } },
      });

      expect(updated.draftCharacter.customAttributes).toEqual({
        strength: 12,
        agility: 8,
      });
    });

    it('throws when appending to a completed session', () => {
      const session = createSession().complete();

      expect(() =>
        session.appendExchange({
          userMessage: 'Encore un message ?',
          assistantMessage: 'Non, la fiche est validee.',
        }),
      ).toThrow();
    });
  });

  describe('complete', () => {
    it('transitions in_progress -> completed', () => {
      const session = createSession();

      const completed = session.complete();

      expect(completed.status).toBe('completed');
    });

    it('throws when completing an already-completed session', () => {
      const session = createSession().complete();

      expect(() => session.complete()).toThrow();
    });
  });
});
