import { Injectable } from '@nestjs/common';
import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import { GameSystemRepository } from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { PdfTextExtractorPort } from '../../domain/game-system/pdf-text-extractor';

export interface CreateGameSystemInput {
  name: string;
  description: string;
  adaptedForChildren: boolean;
  rulesFileBuffer: Buffer;
  rulesSourceFileName: string;
  characterSheetSchema: CharacterSheetSchema;
  mechanicalActions: MechanicalAction[];
}

/** Extracts the rules PDF text once and adds the game system to the catalog. */
@Injectable()
export class CreateGameSystemUseCase {
  constructor(
    private readonly gameSystemRepository: GameSystemRepository,
    private readonly pdfTextExtractor: PdfTextExtractorPort,
  ) {}

  async execute(input: CreateGameSystemInput): Promise<GameSystem> {
    const rulesText = await this.pdfTextExtractor.extractText(
      input.rulesFileBuffer,
    );

    const gameSystem = GameSystem.create({
      name: input.name,
      description: input.description,
      adaptedForChildren: input.adaptedForChildren,
      rulesText,
      rulesSourceFileName: input.rulesSourceFileName,
      characterSheetSchema: input.characterSheetSchema,
      mechanicalActions: input.mechanicalActions,
    });

    await this.gameSystemRepository.save(gameSystem);
    return gameSystem;
  }
}
