import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageGenerationPort } from '../../domain/world-map/image-generation.port';

interface OpenAiImagesResponse {
  data?: { url?: string }[];
}

/**
 * Calls the OpenAI Images API (DALL·E) - same provider as the LLM text
 * orchestration to start with (see PRD.md - "Carte du monde"). Reads
 * `IMAGE_PROVIDER`/`OPENAI_API_KEY` lazily (at call time, not in the
 * constructor) so the app can boot in environments where image generation
 * is not configured yet (see `.env.example`).
 *
 * The OpenAI generation URL is short-lived - this adapter downloads it
 * immediately and returns the raw bytes, so no caller of
 * `ImageGenerationPort` ever sees (or could persist) a third-party URL.
 */
@Injectable()
export class OpenAiImageGenerationAdapter extends ImageGenerationPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async generate(prompt: string): Promise<Buffer> {
    const provider = this.config.get<string>('IMAGE_PROVIDER', 'openai');
    if (provider !== 'openai') {
      throw new Error(`Unsupported IMAGE_PROVIDER "${provider}"`);
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
        }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Image generation failed: ${response.status} ${errorBody.slice(0, 500)}`,
      );
    }

    const body = (await response.json()) as OpenAiImagesResponse;
    const imageUrl = body.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('Image generation returned no image URL');
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download the generated image: ${imageResponse.status}`,
      );
    }

    return Buffer.from(await imageResponse.arrayBuffer());
  }
}
