import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PdfTextExtractorPort } from '../../../domain/game-system/pdf-text-extractor';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { GameSystemModule } from '../modules/game-system.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

// The real PdfParseTextExtractor (infrastructure/game-system/pdf-parse-text-extractor.ts)
// wraps the third-party `pdf-parse` library - consistent with this repo's
// convention of not unit-testing thin infra adapters (see e.g.
// JwksAccessTokenVerifier, HttpOAuthClient), it is swapped for a fake here so
// this suite stays focused on what it owns: multipart/multer wiring, DTO
// validation and the HTTP <-> use-case <-> repository plumbing.
class FakePdfTextExtractor extends PdfTextExtractorPort {
  async extractText(): Promise<string> {
    return 'Texte extrait du PDF';
  }
}

// Any bytes work here since PdfTextExtractorPort is faked above - only the
// declared mimetype matters for the multer fileFilter under test.
const MINIMAL_PDF = Buffer.from('%PDF-1.4 fake rules content for tests');

interface GameSystemApiResponse {
  name: string;
  rulesSourceFileName: string;
  rulesText: string;
}

const ADMIN_USER: CurrentUserPayload = {
  id: 'admin-1',
  email: 'admin@test.dev',
  name: 'Admin',
};

function validCharacterSheetSchema() {
  return JSON.stringify({
    hitPoints: { defaultMax: 20 },
    inventory: { defaultItems: ['Torche'] },
    customAttributes: [
      { key: 'strength', label: 'Force', type: 'number', default: 10 },
    ],
  });
}

function validMechanicalActions() {
  return JSON.stringify([
    {
      actionKey: 'melee-attack',
      label: 'Attaque au corps a corps',
      diceFormula: '1d20',
    },
  ]);
}

describe('GameSystemController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ ADMIN_EMAILS: 'admin@test.dev' })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [GameSystemOrmEntity, UserProfileOrmEntity],
        }),
        GameSystemModule,
      ],
    })
      .overrideProvider(PdfTextExtractorPort)
      .useClass(FakePdfTextExtractor)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // No AuthModule/JwtAuthGuard in this isolated module test (out of this
    // task's scope, already covered by its own tests) - simulate an
    // authenticated request the same way the guard would.
    app.use(
      (req: { user?: CurrentUserPayload }, _res: unknown, next: () => void) => {
        req.user = ADMIN_USER;
        next();
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a game system from a valid PDF upload and returns the extracted rules text', async () => {
    const response = await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', 'Donjons & Dragons')
      .field('description', 'JdR de fantasy medievale')
      .field('adaptedForChildren', 'false')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions())
      .attach('rulesFile', MINIMAL_PDF, {
        filename: 'rules.pdf',
        contentType: 'application/pdf',
      });

    const body = response.body as GameSystemApiResponse;
    expect(response.status).toBe(201);
    expect(body.name).toBe('Donjons & Dragons');
    expect(body.rulesSourceFileName).toBe('rules.pdf');
    expect(typeof body.rulesText).toBe('string');
  });

  it('rejects a non-PDF file', async () => {
    const response = await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', 'JdR invalide')
      .field('description', '')
      .field('adaptedForChildren', 'false')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions())
      .attach('rulesFile', Buffer.from('not a pdf'), {
        filename: 'rules.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
  });

  it('rejects a PDF file that exceeds the size limit', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, 'a');

    const response = await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', 'JdR trop gros')
      .field('description', '')
      .field('adaptedForChildren', 'false')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions())
      .attach('rulesFile', oversized, {
        filename: 'huge.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(413);
  });

  it('rejects a request missing the rulesFile', async () => {
    const response = await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', 'JdR sans fichier')
      .field('description', '')
      .field('adaptedForChildren', 'false')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions());

    expect(response.status).toBe(400);
  });

  it('lists the created game systems for an authenticated caller', async () => {
    await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', 'JdR pour enfants')
      .field('description', '')
      .field('adaptedForChildren', 'true')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions())
      .attach('rulesFile', MINIMAL_PDF, {
        filename: 'kids.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/game-systems')
      .expect(200);
    const names = (listResponse.body as GameSystemApiResponse[]).map(
      (g) => g.name,
    );
    expect(names).toContain('JdR pour enfants');
    expect(names).toContain('Donjons & Dragons');
  });
});
