import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { PdfTextExtractorPort } from '../../domain/game-system/pdf-text-extractor';

/**
 * Lightweight, no-OCR PDF text extraction (see PRD.md - "pas de RAG en
 * V1"). Runs once at upload time; the resulting text is stored on the
 * GameSystem and injected in full in the LLM system prompt at each turn.
 */
@Injectable()
export class PdfParseTextExtractor extends PdfTextExtractorPort {
  async extractText(fileBuffer: Buffer): Promise<string> {
    const result = await pdfParse(fileBuffer);
    return result.text.trim();
  }
}
