import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';
import {
  RESOLVE_SCENE_TOOL_NAME,
  RESOLVE_SCENE_TOOL_SCHEMA,
  ResolveSceneToolInput,
  SUMMARIZE_USER_MESSAGE,
  buildResolveSceneSystemPrompt,
  buildResolveSceneUserMessage,
  buildSummarizeSystemPrompt,
  toSceneResolutionOutput,
} from './llm-game-master-prompt';

const OPENAI_CHAT_COMPLETIONS_URL =
  'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

interface OpenAiToolCall {
  function?: { name?: string; arguments?: string };
}

interface OpenAiChatCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: OpenAiToolCall[];
    };
  }[];
}

/**
 * Calls the OpenAI Chat Completions API. Forces the model to answer via a
 * single function call (`resolve_scene`) so narration and character deltas
 * never have to be parsed out of free-text (same contract as
 * `ClaudeGameMasterAdapter` - see `tasks/04-llm-orchestration.md`).
 *
 * Reads `OPENAI_API_KEY`/`OPENAI_MODEL` lazily (at call time), same pattern
 * as `OpenAiImageGenerationAdapter`. The key is never logged and never
 * appears in any thrown error message.
 */
@Injectable()
export class OpenAiGameMasterAdapter extends LlmGameMasterPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async resolveScene(
    input: SceneResolutionInput,
  ): Promise<SceneResolutionOutput> {
    const body = await this.call({
      system: buildResolveSceneSystemPrompt(input),
      userMessage: buildResolveSceneUserMessage(input),
      tools: [
        {
          type: 'function',
          function: {
            name: RESOLVE_SCENE_TOOL_NAME,
            description:
              'Retourne la narration et les deltas de personnage proposés pour ce tour résolu.',
            parameters: RESOLVE_SCENE_TOOL_SCHEMA,
          },
        },
      ],
      toolChoice: {
        type: 'function',
        function: { name: RESOLVE_SCENE_TOOL_NAME },
      },
    });

    const toolCall = body.choices?.[0]?.message?.tool_calls?.find(
      (call) => call.function?.name === RESOLVE_SCENE_TOOL_NAME,
    );
    const rawArguments = toolCall?.function?.arguments;
    if (!rawArguments) {
      throw new Error(
        `OpenAI did not return a "${RESOLVE_SCENE_TOOL_NAME}" function call`,
      );
    }

    return toSceneResolutionOutput(
      JSON.parse(rawArguments) as ResolveSceneToolInput,
    );
  }

  async summarize(input: SummarizeSceneInput): Promise<string> {
    const body = await this.call({
      system: buildSummarizeSystemPrompt(input),
      userMessage: SUMMARIZE_USER_MESSAGE,
    });

    return (body.choices?.[0]?.message?.content ?? '').trim();
  }

  private async call(options: {
    system: string;
    userMessage: string;
    tools?: {
      type: 'function';
      function: {
        name: string;
        description: string;
        parameters: typeof RESOLVE_SCENE_TOOL_SCHEMA;
      };
    }[];
    toolChoice?: { type: 'function'; function: { name: string } };
  }): Promise<OpenAiChatCompletionResponse> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const model = this.config.get<string>('OPENAI_MODEL', DEFAULT_MODEL);

    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: options.system },
          { role: 'user', content: options.userMessage },
        ],
        ...(options.tools ? { tools: options.tools } : {}),
        ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API call failed: ${response.status}`);
    }

    return (await response.json()) as OpenAiChatCompletionResponse;
  }
}
