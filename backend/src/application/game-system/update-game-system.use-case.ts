import { Injectable } from '@nestjs/common';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { PdfTextExtractorPort } from '../../domain/game-system/pdf-text-extractor';

export interface UpdateGameSystemInput {
  name?: string;
  description?: string;
  adaptedForChildren?: boolean;
  characterSheetSchema?: CharacterSheetSchema;
  mechanicalActions?: MechanicalAction[];
  rulesFileBuffer?: Buffer;
  rulesSourceFileName?: string;
}

/**
 * Partially updates a game system. Re-extracts the rules text only when a
 * new PDF is uploaded. Known limitation (see tasks/01-game-catalog.md -
 * "Hors périmètre"): a game system edited after being used in an ongoing
 * session impacts that session too - no versioning in V1.
 */
@Injectable()
export class UpdateGameSystemUseCase {
  constructor(
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly pdfTextExtractor: PdfTextExtractorPort,
  ) {}

  async execute(
    id: string,
    input: UpdateGameSystemInput,
  ): Promise<GameSystem | null> {
    const existing = await this.gameSystemRepository.findById(id);
    if (!existing) {
      return null;
    }

    const rulesText = input.rulesFileBuffer
      ? await this.pdfTextExtractor.extractText(input.rulesFileBuffer)
      : undefined;

    const updated = existing.update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.adaptedForChildren !== undefined && {
        adaptedForChildren: input.adaptedForChildren,
      }),
      ...(input.characterSheetSchema !== undefined && {
        characterSheetSchema: input.characterSheetSchema,
      }),
      ...(input.mechanicalActions !== undefined && {
        mechanicalActions: input.mechanicalActions,
      }),
      ...(rulesText !== undefined && {
        rulesText,
        rulesSourceFileName:
          input.rulesSourceFileName ?? existing.rulesSourceFileName,
      }),
    });

    await this.gameSystemRepository.save(updated);
    return updated;
  }
}
