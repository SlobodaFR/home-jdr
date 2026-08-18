import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { PdfTextExtractorPort } from '../../domain/game-system/pdf-text-extractor';
import { CreateGameSystemUseCase } from './create-game-system.use-case';

class InMemoryGameSystemRepository extends GameSystemRepository {
  constructor(private gameSystems: GameSystem[] = []) {
    super();
  }

  async findById(id: string): Promise<GameSystem | null> {
    return this.gameSystems.find((g) => g.id === id) ?? null;
  }

  async findAll(filter?: GameSystemListFilter): Promise<GameSystem[]> {
    return filter?.childSafeOnly
      ? this.gameSystems.filter((g) => g.adaptedForChildren)
      : this.gameSystems;
  }

  async save(gameSystem: GameSystem): Promise<void> {
    this.gameSystems = [
      ...this.gameSystems.filter((g) => g.id !== gameSystem.id),
      gameSystem,
    ];
  }

  async deleteById(id: string): Promise<void> {
    this.gameSystems = this.gameSystems.filter((g) => g.id !== id);
  }
}

class FakePdfTextExtractor extends PdfTextExtractorPort {
  constructor(private readonly text: string) {
    super();
  }

  async extractText(): Promise<string> {
    return this.text;
  }
}

describe('CreateGameSystemUseCase', () => {
  const characterSheetSchema: CharacterSheetSchema = {
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: [] },
    customAttributes: [],
  };
  const mechanicalActions: MechanicalAction[] = [
    {
      actionKey: 'melee-attack',
      label: 'Attaque au corps a corps',
      diceFormula: '1d20',
    },
  ];

  it('extracts the rules text from the uploaded PDF and stores the game system', async () => {
    const repository = new InMemoryGameSystemRepository();
    const useCase = new CreateGameSystemUseCase(
      repository,
      new FakePdfTextExtractor('Texte extrait du PDF'),
    );

    const gameSystem = await useCase.execute({
      name: 'Donjons & Dragons',
      description: 'JdR de fantasy',
      adaptedForChildren: false,
      rulesFileBuffer: Buffer.from('%PDF-1.4 ...'),
      rulesSourceFileName: 'dnd.pdf',
      characterSheetSchema,
      mechanicalActions,
    });

    expect(gameSystem.rulesText).toBe('Texte extrait du PDF');
    await expect(repository.findById(gameSystem.id)).resolves.not.toBeNull();
  });

  it('propagates domain validation errors instead of persisting an invalid game system', async () => {
    const repository = new InMemoryGameSystemRepository();
    const useCase = new CreateGameSystemUseCase(
      repository,
      new FakePdfTextExtractor('texte'),
    );

    await expect(
      useCase.execute({
        name: 'Invalide',
        description: '',
        adaptedForChildren: false,
        rulesFileBuffer: Buffer.from(''),
        rulesSourceFileName: 'invalide.pdf',
        characterSheetSchema: {
          ...characterSheetSchema,
          hitPoints: { defaultMax: 0 },
        },
        mechanicalActions,
      }),
    ).rejects.toThrow(/hitPoints/);

    await expect(repository.findAll()).resolves.toHaveLength(0);
  });
});
