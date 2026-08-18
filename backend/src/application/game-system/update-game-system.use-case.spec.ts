import { CharacterSheetSchema } from '../../domain/game-system/character-sheet-schema';
import { GameSystem } from '../../domain/game-system/game-system';
import {
  GameSystemListFilter,
  GameSystemRepository,
} from '../../domain/game-system/game-system.repository';
import { MechanicalAction } from '../../domain/game-system/mechanical-action';
import { PdfTextExtractorPort } from '../../domain/game-system/pdf-text-extractor';
import { UpdateGameSystemUseCase } from './update-game-system.use-case';

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
}

class FakePdfTextExtractor extends PdfTextExtractorPort {
  constructor(private readonly text: string) {
    super();
  }

  async extractText(): Promise<string> {
    return this.text;
  }
}

describe('UpdateGameSystemUseCase', () => {
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

  function existingGameSystem(): GameSystem {
    return GameSystem.create({
      name: 'Donjons & Dragons',
      description: 'JdR de fantasy',
      adaptedForChildren: false,
      rulesText: 'Ancien texte',
      rulesSourceFileName: 'dnd-v1.pdf',
      characterSheetSchema,
      mechanicalActions,
    });
  }

  it('returns null when the game system does not exist', async () => {
    const repository = new InMemoryGameSystemRepository();
    const useCase = new UpdateGameSystemUseCase(
      repository,
      new FakePdfTextExtractor('texte'),
    );

    await expect(
      useCase.execute('unknown-id', { adaptedForChildren: true }),
    ).resolves.toBeNull();
  });

  it('updates the flagged fields while keeping the rest unchanged', async () => {
    const existing = existingGameSystem();
    const repository = new InMemoryGameSystemRepository([existing]);
    const useCase = new UpdateGameSystemUseCase(
      repository,
      new FakePdfTextExtractor('texte'),
    );

    const updated = await useCase.execute(existing.id, {
      adaptedForChildren: true,
    });

    expect(updated?.adaptedForChildren).toBe(true);
    expect(updated?.name).toBe(existing.name);
    expect(updated?.rulesText).toBe('Ancien texte');
  });

  it('re-extracts the rules text when a new PDF is uploaded', async () => {
    const existing = existingGameSystem();
    const repository = new InMemoryGameSystemRepository([existing]);
    const useCase = new UpdateGameSystemUseCase(
      repository,
      new FakePdfTextExtractor('Nouveau texte'),
    );

    const updated = await useCase.execute(existing.id, {
      rulesFileBuffer: Buffer.from('%PDF-1.4 ...'),
      rulesSourceFileName: 'dnd-v2.pdf',
    });

    expect(updated?.rulesText).toBe('Nouveau texte');
    expect(updated?.rulesSourceFileName).toBe('dnd-v2.pdf');
  });
});
