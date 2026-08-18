import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CharacterCreationAssistInput,
  CharacterCreationAssistOutput,
  LlmGameMasterPort,
  SceneResolutionInput,
  SceneResolutionOutput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';
import {
  ASSIST_CHARACTER_CREATION_TOOL_NAME,
  ASSIST_CHARACTER_CREATION_TOOL_SCHEMA,
  AssistCharacterCreationToolInput,
  RESOLVE_SCENE_TOOL_NAME,
  RESOLVE_SCENE_TOOL_SCHEMA,
  ResolveSceneToolInput,
  SUMMARIZE_USER_MESSAGE,
  buildAssistCharacterCreationSystemPrompt,
  buildAssistCharacterCreationUserMessage,
  buildResolveSceneSystemPrompt,
  buildResolveSceneUserMessage,
  buildSummarizeSystemPrompt,
  toCharacterCreationAssistOutput,
  toSceneResolutionOutput,
} from './llm-game-master-prompt';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicContentBlock {
  type: string;
  text?: string;
  input?: unknown;
}

interface AnthropicMessageResponse {
  content?: AnthropicContentBlock[];
}

/**
 * Calls the Anthropic Messages API. Forces the model to answer via a single
 * tool call (`resolve_scene`) so narration and character deltas never have
 * to be parsed out of free-text (see `tasks/04-llm-orchestration.md`).
 *
 * Reads `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` lazily (at call time, not in
 * the constructor) so the app can boot without it configured, same pattern
 * as `OpenAiImageGenerationAdapter`. The key is never logged and never
 * appears in any thrown error message (see `CLAUDE.md` - clés API, secrets
 * serveur uniquement).
 */
@Injectable()
export class ClaudeGameMasterAdapter extends LlmGameMasterPort {
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
          name: RESOLVE_SCENE_TOOL_NAME,
          description:
            'Retourne la narration et les deltas de personnage proposés pour ce tour résolu.',
          input_schema: RESOLVE_SCENE_TOOL_SCHEMA,
        },
      ],
      toolChoice: { type: 'tool', name: RESOLVE_SCENE_TOOL_NAME },
      maxTokens: 2048,
    });

    const toolUse = body.content?.find((block) => block.type === 'tool_use');
    if (
      !toolUse ||
      typeof toolUse.input !== 'object' ||
      toolUse.input === null
    ) {
      throw new Error(
        `Claude did not return a "${RESOLVE_SCENE_TOOL_NAME}" tool call`,
      );
    }

    return toSceneResolutionOutput(toolUse.input as ResolveSceneToolInput);
  }

  async summarize(input: SummarizeSceneInput): Promise<string> {
    const body = await this.call({
      system: buildSummarizeSystemPrompt(input),
      userMessage: SUMMARIZE_USER_MESSAGE,
      maxTokens: 1024,
    });

    const textBlock = body.content?.find((block) => block.type === 'text');
    return (textBlock?.text ?? '').trim();
  }

  async assistCharacterCreation(
    input: CharacterCreationAssistInput,
  ): Promise<CharacterCreationAssistOutput> {
    const body = await this.call({
      system: buildAssistCharacterCreationSystemPrompt(input),
      userMessage: buildAssistCharacterCreationUserMessage(input),
      tools: [
        {
          name: ASSIST_CHARACTER_CREATION_TOOL_NAME,
          description:
            'Retourne le prochain message du MJ et les mises à jour de brouillon de fiche pour cette étape de création de personnage.',
          input_schema: ASSIST_CHARACTER_CREATION_TOOL_SCHEMA,
        },
      ],
      toolChoice: { type: 'tool', name: ASSIST_CHARACTER_CREATION_TOOL_NAME },
      maxTokens: 1024,
    });

    const toolUse = body.content?.find((block) => block.type === 'tool_use');
    if (
      !toolUse ||
      typeof toolUse.input !== 'object' ||
      toolUse.input === null
    ) {
      throw new Error(
        `Claude did not return a "${ASSIST_CHARACTER_CREATION_TOOL_NAME}" tool call`,
      );
    }

    return toCharacterCreationAssistOutput(
      toolUse.input as AssistCharacterCreationToolInput,
    );
  }

  private async call(options: {
    system: string;
    userMessage: string;
    maxTokens: number;
    tools?: {
      name: string;
      description: string;
      input_schema:
        | typeof RESOLVE_SCENE_TOOL_SCHEMA
        | typeof ASSIST_CHARACTER_CREATION_TOOL_SCHEMA;
    }[];
    toolChoice?: { type: 'tool'; name: string };
  }): Promise<AnthropicMessageResponse> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    const model = this.config.get<string>('ANTHROPIC_MODEL', DEFAULT_MODEL);

    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens,
        system: options.system,
        messages: [{ role: 'user', content: options.userMessage }],
        ...(options.tools ? { tools: options.tools } : {}),
        ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
      }),
    });

    if (!response.ok) {
      // Never include response headers/body in the error - could echo back
      // request metadata; status code alone is enough to diagnose.
      throw new Error(`Claude API call failed: ${response.status}`);
    }

    return (await response.json()) as AnthropicMessageResponse;
  }
}
