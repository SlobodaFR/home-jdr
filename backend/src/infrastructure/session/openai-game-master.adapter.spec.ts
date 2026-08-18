import { ConfigService } from '@nestjs/config';
import { OpenAiGameMasterAdapter } from './openai-game-master.adapter';
import {
  LlmGameMasterContractHarness,
  runLlmGameMasterPortContractTests,
} from './llm-game-master-port.contract';

function fakeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function buildHarness(): LlmGameMasterContractHarness {
  const adapter = new OpenAiGameMasterAdapter(
    fakeConfig({ OPENAI_API_KEY: 'test-api-key' }),
  );
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  return {
    adapter,
    mockResolveSceneReply(reply) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: 'resolve_scene',
                        arguments: JSON.stringify({
                          narration_text: reply.narrationText,
                          character_deltas: reply.characterDeltas.map(
                            (delta) => ({
                              character_id: delta.characterId,
                              hit_points: delta.hitPoints,
                              inventory_add: delta.inventoryAdd,
                            }),
                          ),
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
      });
    },
    mockSummarizeReply(summary) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ choices: [{ message: { content: summary } }] }),
      });
    },
    mockAssistCharacterCreationReply(reply) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: 'assist_character_creation',
                        arguments: JSON.stringify({
                          assistant_message: reply.assistantMessage,
                          draft_updates: {
                            name: reply.draftUpdates?.name,
                            hit_points_max: reply.draftUpdates?.hitPointsMax,
                            inventory: reply.draftUpdates?.inventory,
                            custom_attribute_changes:
                              reply.draftUpdates?.customAttributes,
                          },
                          ready_to_finalize: reply.readyToFinalize,
                        }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
      });
    },
    lastRequestBody() {
      const [, init] = mockFetch.mock.calls[
        mockFetch.mock.calls.length - 1
      ] as [string, RequestInit];
      return JSON.parse(init.body as string) as Record<string, unknown>;
    },
  };
}

describe('OpenAiGameMasterAdapter', () => {
  runLlmGameMasterPortContractTests(buildHarness);

  it('calls the OpenAI Chat Completions API with the API key as a Bearer header, forcing the resolve_scene function', async () => {
    const harness = buildHarness();
    harness.mockResolveSceneReply({
      narrationText: 'texte',
      characterDeltas: [],
    });

    await harness.adapter.resolveScene({
      rulesText: 'regles',
      characterSheetSchema: {
        baseAttributes: { hitPoints: { max: 1 }, inventory: [] },
        customAttributes: [],
      },
      characters: [],
      recentTurns: [],
      rollingSummary: '',
      submittedActions: [],
      diceFacts: [],
    });

    const mockFetch = global.fetch as unknown as jest.Mock;
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-api-key',
    );
    const body = JSON.parse(init.body as string) as {
      tool_choice?: { function: { name: string } };
    };
    expect(body.tool_choice?.function.name).toBe('resolve_scene');
  });

  it('calls the OpenAI Chat Completions API forcing the assist_character_creation function', async () => {
    const harness = buildHarness();
    harness.mockAssistCharacterCreationReply({
      assistantMessage: 'texte',
      readyToFinalize: false,
    });

    await harness.adapter.assistCharacterCreation({
      rulesText: 'regles',
      characterSheetSchema: {
        baseAttributes: { hitPoints: { max: 1 }, inventory: [] },
        customAttributes: [],
      },
      messages: [],
      draftCharacter: {},
    });

    const mockFetch = global.fetch as unknown as jest.Mock;
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      tool_choice?: { function: { name: string } };
    };
    expect(body.tool_choice?.function.name).toBe('assist_character_creation');
  });

  it('throws (without leaking the key) when OPENAI_API_KEY is not configured', async () => {
    const adapter = new OpenAiGameMasterAdapter(fakeConfig({}));

    await expect(
      adapter.resolveScene({
        rulesText: '',
        characterSheetSchema: {
          baseAttributes: { hitPoints: { max: 1 }, inventory: [] },
          customAttributes: [],
        },
        characters: [],
        recentTurns: [],
        rollingSummary: '',
        submittedActions: [],
        diceFacts: [],
      }),
    ).rejects.toThrow('OPENAI_API_KEY is not configured');
  });
});
