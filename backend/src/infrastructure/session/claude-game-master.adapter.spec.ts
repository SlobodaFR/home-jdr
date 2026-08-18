import { ConfigService } from '@nestjs/config';
import { ClaudeGameMasterAdapter } from './claude-game-master.adapter';
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
  const adapter = new ClaudeGameMasterAdapter(
    fakeConfig({ ANTHROPIC_API_KEY: 'test-api-key' }),
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
            content: [
              {
                type: 'tool_use',
                name: 'resolve_scene',
                input: {
                  narration_text: reply.narrationText,
                  character_deltas: reply.characterDeltas.map((delta) => ({
                    character_id: delta.characterId,
                    hit_points: delta.hitPoints,
                    inventory_add: delta.inventoryAdd,
                  })),
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
          Promise.resolve({ content: [{ type: 'text', text: summary }] }),
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

describe('ClaudeGameMasterAdapter', () => {
  runLlmGameMasterPortContractTests(buildHarness);

  it('calls the Anthropic Messages API with the API key as a header, forcing the resolve_scene tool', async () => {
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
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe(
      'test-api-key',
    );
    const body = JSON.parse(init.body as string) as {
      tool_choice?: { name: string };
    };
    expect(body.tool_choice?.name).toBe('resolve_scene');
  });

  it('throws (without leaking the key) when ANTHROPIC_API_KEY is not configured', async () => {
    const adapter = new ClaudeGameMasterAdapter(fakeConfig({}));

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
    ).rejects.toThrow('ANTHROPIC_API_KEY is not configured');
  });
});
