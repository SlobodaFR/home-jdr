import { CharacterSheetSchema } from '../../domain/character/character-sheet-schema';
import {
  CharacterCreationAssistInput,
  LlmGameMasterPort,
  SceneResolutionInput,
} from '../../domain/session/llm-game-master.port';

/**
 * Shared contract test suite for every `LlmGameMasterPort` adapter (see
 * `tasks/04-llm-orchestration.md` - "Swap de LLM_PROVIDER de claude à
 * openai ne casse aucun test - les deux adapters implémentent le même port
 * et sont testés avec la même suite de contrats"). Each adapter spec
 * (`claude-game-master.adapter.spec.ts`, `openai-game-master.adapter.spec.ts`)
 * mocks its own provider's HTTP wire format, then hands this suite a
 * harness that speaks only in terms of the port's contract - so this file
 * has zero knowledge of Claude/OpenAI request/response shapes.
 */
export interface LlmGameMasterContractHarness {
  adapter: LlmGameMasterPort;
  /** Programs the mocked HTTP client to answer the next `resolveScene()` call. */
  mockResolveSceneReply(reply: {
    narrationText: string;
    characterDeltas: {
      characterId: string;
      hitPoints?: number;
      inventoryAdd?: string[];
    }[];
  }): void;
  /** Programs the mocked HTTP client to answer the next `summarize()` call. */
  mockSummarizeReply(summary: string): void;
  /** Programs the mocked HTTP client to answer the next `assistCharacterCreation()` call. */
  mockAssistCharacterCreationReply(reply: {
    assistantMessage: string;
    draftUpdates?: {
      name?: string;
      hitPointsMax?: number;
      inventory?: string[];
      customAttributes?: Record<string, number | string>;
    };
    readyToFinalize: boolean;
  }): void;
  /** The JSON body of the most recent outgoing HTTP request. */
  lastRequestBody(): Record<string, unknown>;
}

const schema: CharacterSheetSchema = {
  baseAttributes: { hitPoints: { max: 30 }, inventory: [] },
  customAttributes: [],
};

function buildInput(): SceneResolutionInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    characterSheetSchema: schema,
    characters: [
      {
        characterId: 'character-1',
        name: 'Grognak',
        hitPointsCurrent: 30,
        hitPointsMax: 30,
        inventory: [],
        customAttributes: {},
      },
    ],
    recentTurns: [],
    rollingSummary: '',
    submittedActions: [
      {
        playerId: 'user-1',
        characterId: 'character-1',
        actionText: 'Je frappe le gobelin',
        mechanicalActionKey: 'melee-attack',
      },
    ],
    diceFacts: [
      {
        playerId: 'user-1',
        actionKey: 'melee-attack',
        actionLabel: 'Attaque au corps a corps',
        formula: '1d20+3',
        rolls: [14],
        total: 17,
      },
    ],
  };
}

function buildCharacterCreationInput(): CharacterCreationAssistInput {
  return {
    rulesText: 'Un d20 sous la stat reussit.',
    characterSheetSchema: schema,
    messages: [
      {
        role: 'assistant',
        content: 'Bienvenue ! Parle-moi de ton personnage.',
      },
      { role: 'user', content: 'Je veux jouer un nain guerrier.' },
    ],
    draftCharacter: {},
  };
}

export function runLlmGameMasterPortContractTests(
  createHarness: () => LlmGameMasterContractHarness,
): void {
  describe('LlmGameMasterPort contract', () => {
    it('resolveScene() returns the narration and character deltas from the provider response', async () => {
      const harness = createHarness();
      harness.mockResolveSceneReply({
        narrationText: 'Le gobelin encaisse le coup et recule.',
        characterDeltas: [{ characterId: 'goblin-1', hitPoints: -12 }],
      });

      const output = await harness.adapter.resolveScene(buildInput());

      expect(output.narrationText).toBe(
        'Le gobelin encaisse le coup et recule.',
      );
      expect(output.characterDeltas).toHaveLength(1);
      expect(output.characterDeltas[0].characterId).toBe('goblin-1');
      expect(output.characterDeltas[0].delta.hitPoints).toBe(-12);
    });

    it('resolveScene() sends the already-rolled dice results as non-negotiable facts', async () => {
      const harness = createHarness();
      harness.mockResolveSceneReply({
        narrationText: 'texte',
        characterDeltas: [],
      });

      await harness.adapter.resolveScene(buildInput());

      const body = JSON.stringify(harness.lastRequestBody());
      expect(body).toContain('17');
      expect(body).toContain('1d20+3');
    });

    it('resolveScene() sends the full rules text (no RAG - see PRD.md)', async () => {
      const harness = createHarness();
      harness.mockResolveSceneReply({
        narrationText: 'texte',
        characterDeltas: [],
      });

      await harness.adapter.resolveScene(buildInput());

      const body = JSON.stringify(harness.lastRequestBody());
      expect(body).toContain('Un d20 sous la stat reussit.');
    });

    it('summarize() returns the condensed summary text from the provider', async () => {
      const harness = createHarness();
      harness.mockSummarizeReply(
        'Les heros ont vaincu le gobelin et pille son campement.',
      );

      const summary = await harness.adapter.summarize({
        rulesText: 'Un d20 sous la stat reussit.',
        previousRollingSummary: '',
        turnsToSummarize: [
          { turnNumber: 1, narrationText: 'Le combat commence.' },
        ],
      });

      expect(summary).toBe(
        'Les heros ont vaincu le gobelin et pille son campement.',
      );
    });

    it('assistCharacterCreation() returns the assistant message, draft updates, and readiness hint from the provider', async () => {
      const harness = createHarness();
      harness.mockAssistCharacterCreationReply({
        assistantMessage: 'Quel est le nom de ton personnage ?',
        draftUpdates: { name: 'Grognak', inventory: ['hache'] },
        readyToFinalize: false,
      });

      const output = await harness.adapter.assistCharacterCreation(
        buildCharacterCreationInput(),
      );

      expect(output.assistantMessage).toBe(
        'Quel est le nom de ton personnage ?',
      );
      expect(output.draftUpdates).toEqual({
        name: 'Grognak',
        inventory: ['hache'],
      });
      expect(output.readyToFinalize).toBe(false);
    });

    it('assistCharacterCreation() sends the full rules text and target schema (no RAG - see PRD.md)', async () => {
      const harness = createHarness();
      harness.mockAssistCharacterCreationReply({
        assistantMessage: 'texte',
        readyToFinalize: false,
      });

      await harness.adapter.assistCharacterCreation(
        buildCharacterCreationInput(),
      );

      const body = JSON.stringify(harness.lastRequestBody());
      expect(body).toContain('Un d20 sous la stat reussit.');
      expect(body).toContain('Je veux jouer un nain guerrier.');
    });

    it('never puts the API key in the request body', async () => {
      const harness = createHarness();
      harness.mockResolveSceneReply({
        narrationText: 'texte',
        characterDeltas: [],
      });

      await harness.adapter.resolveScene(buildInput());

      const body = JSON.stringify(harness.lastRequestBody());
      expect(body).not.toContain('test-api-key');
    });
  });
}
