import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import {
  CharacterCreationAssistInput,
  OpeningNarrationInput,
  SceneResolutionInput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';
import {
  buildAssistCharacterCreationSystemPrompt,
  buildOpeningNarrationSystemPrompt,
  buildResolveSceneSystemPrompt,
  buildSummarizeSystemPrompt,
} from './llm-game-master-prompt';

const schema: CharacterSheetSchema = {
  baseAttributes: { hitPoints: { max: 30 }, inventory: [] },
  customAttributes: [],
};

/**
 * Loose substring match on the wording spec'd in the opening-narration task
 * brief, rather than the exact sentence - keeps this test resilient to
 * minor prose tweaks while still proving the *instruction itself* is
 * present.
 */
const ROLEPLAY_INSTRUCTION_MARKER = 'incarnes le Maître du Jeu';

function buildResolveSceneInput(): SceneResolutionInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    characterSheetSchema: schema,
    characters: [],
    recentTurns: [],
    rollingSummary: '',
    submittedActions: [],
    diceFacts: [],
  };
}

function buildAssistInput(): CharacterCreationAssistInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    characterSheetSchema: schema,
    messages: [],
    draftCharacter: {},
  };
}

function buildOpeningNarrationInput(): OpeningNarrationInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    characterSheetSchema: schema,
    gameSystemName: 'Donjons oublies',
    gameSystemDescription: 'desc',
    characters: [],
  };
}

function buildSummarizeInput(): SummarizeSceneInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    previousRollingSummary: '',
    turnsToSummarize: [],
  };
}

describe('llm-game-master-prompt - roleplay/tone instruction', () => {
  it('is present in the cacheablePrefix of buildResolveSceneSystemPrompt', () => {
    const prompt = buildResolveSceneSystemPrompt(buildResolveSceneInput());

    expect(prompt.cacheablePrefix).toContain(ROLEPLAY_INSTRUCTION_MARKER);
  });

  it('is present in the cacheablePrefix of buildAssistCharacterCreationSystemPrompt', () => {
    const prompt = buildAssistCharacterCreationSystemPrompt(buildAssistInput());

    expect(prompt.cacheablePrefix).toContain(ROLEPLAY_INSTRUCTION_MARKER);
  });

  it('is present in the cacheablePrefix of buildOpeningNarrationSystemPrompt', () => {
    const prompt = buildOpeningNarrationSystemPrompt(
      buildOpeningNarrationInput(),
    );

    expect(prompt.cacheablePrefix).toContain(ROLEPLAY_INSTRUCTION_MARKER);
  });

  it('is absent from buildSummarizeSystemPrompt (pure mechanical condensation, not roleplay)', () => {
    const prompt = buildSummarizeSystemPrompt(buildSummarizeInput());

    expect(prompt.cacheablePrefix).not.toContain(ROLEPLAY_INSTRUCTION_MARKER);
    expect(prompt.dynamicSuffix).not.toContain(ROLEPLAY_INSTRUCTION_MARKER);
  });
});

describe('llm-game-master-prompt - character-creation options instruction', () => {
  it('buildAssistCharacterCreationSystemPrompt instructs the AI to proactively present character-creation options', () => {
    const prompt = buildAssistCharacterCreationSystemPrompt(buildAssistInput());

    const fullPrompt = prompt.cacheablePrefix + prompt.dynamicSuffix;
    expect(fullPrompt).toContain('races, classes ou archétypes');
    expect(fullPrompt).toContain('proactivement');
  });
});
