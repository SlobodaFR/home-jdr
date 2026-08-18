import { CharacterSheetSchema } from './character-sheet-schema';
import { GameSystem } from './game-system';
import { MechanicalAction } from './mechanical-action';

describe('GameSystem', () => {
  const validSchema: CharacterSheetSchema = {
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: ['Torche'] },
    customAttributes: [
      { key: 'strength', label: 'Force', type: 'number', default: 10 },
    ],
  };
  const validActions: MechanicalAction[] = [
    {
      actionKey: 'melee-attack',
      label: 'Attaque au corps a corps',
      diceFormula: '1d20',
      relatedStat: 'strength',
    },
  ];
  const baseProps = {
    name: 'Donjons & Dragons',
    description: 'JdR de fantasy medievale',
    adaptedForChildren: false,
    rulesText: 'Texte des regles extrait du PDF...',
    rulesSourceFileName: 'dnd-rules.pdf',
    characterSheetSchema: validSchema,
    mechanicalActions: validActions,
  };

  it('creates a game system with a generated id and createdAt', () => {
    const gameSystem = GameSystem.create(baseProps);

    expect(gameSystem.id).toBeTruthy();
    expect(gameSystem.name).toBe('Donjons & Dragons');
    expect(gameSystem.adaptedForChildren).toBe(false);
    expect(gameSystem.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an empty name', () => {
    expect(() => GameSystem.create({ ...baseProps, name: '  ' })).toThrow();
  });

  it('rejects a character sheet schema without a positive hitPoints.defaultMax', () => {
    expect(() =>
      GameSystem.create({
        ...baseProps,
        characterSheetSchema: { ...validSchema, hitPoints: { defaultMax: 0 } },
      }),
    ).toThrow(/hitPoints/);
  });

  it('rejects a custom attribute whose default does not match its declared type', () => {
    expect(() =>
      GameSystem.create({
        ...baseProps,
        characterSheetSchema: {
          ...validSchema,
          customAttributes: [
            { key: 'strength', label: 'Force', type: 'number', default: 'dix' },
          ],
        },
      }),
    ).toThrow(/strength/);
  });

  it('rejects a mechanical action with an invalid dice formula', () => {
    expect(() =>
      GameSystem.create({
        ...baseProps,
        mechanicalActions: [
          { actionKey: 'jump', label: 'Saut', diceFormula: 'not-a-formula' },
        ],
      }),
    ).toThrow(/dice formula/);
  });

  it('rejects duplicate mechanical action keys', () => {
    expect(() =>
      GameSystem.create({
        ...baseProps,
        mechanicalActions: [...validActions, { ...validActions[0] }],
      }),
    ).toThrow(/Duplicate/);
  });

  it('update() returns a new instance with the changed fields, preserving id and createdAt', () => {
    const gameSystem = GameSystem.create(baseProps);

    const updated = gameSystem.update({
      description: 'Nouvelle description',
      adaptedForChildren: true,
    });

    expect(updated.id).toBe(gameSystem.id);
    expect(updated.createdAt).toEqual(gameSystem.createdAt);
    expect(updated.description).toBe('Nouvelle description');
    expect(updated.adaptedForChildren).toBe(true);
    expect(gameSystem.adaptedForChildren).toBe(false);
  });
});
