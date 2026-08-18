import { ImageGenerationPort } from '../../domain/world-map/image-generation.port';

/** Test double shared by the world-map use-case specs. */
export class InMemoryImageGenerationPort extends ImageGenerationPort {
  public readonly prompts: string[] = [];

  constructor(
    private readonly image: Buffer = Buffer.from('fake-image-bytes'),
  ) {
    super();
  }

  generate(prompt: string): Promise<Buffer> {
    this.prompts.push(prompt);
    return Promise.resolve(this.image);
  }
}
