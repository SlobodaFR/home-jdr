/**
 * Port (driven side) implemented by the infrastructure layer. Generates an
 * image from a text prompt and returns its raw bytes - the concrete
 * provider (DALL·E...) is responsible for downloading its own short-lived
 * generation URL itself, so callers never see a third-party URL to persist
 * (see PRD.md - "Carte du monde").
 */
export abstract class ImageGenerationPort {
  abstract generate(prompt: string): Promise<Buffer>;
}
