/**
 * Port (driven side) implemented by the infrastructure layer. Extracts raw
 * text from a rules PDF once, at upload time - no OCR, no re-parsing on each
 * LLM call (see PRD.md - "extrait une fois").
 */
export abstract class PdfTextExtractorPort {
  abstract extractText(fileBuffer: Buffer): Promise<string>;
}
