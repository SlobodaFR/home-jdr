import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PdfTextExtractorPort } from '../../../domain/game-system/pdf-text-extractor';
import { GameSession } from '../../../domain/session/game-session';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
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

const NON_ADMIN_USER: CurrentUserPayload = {
  id: 'player-1',
  email: 'player@test.dev',
  name: 'Joueur',
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
  let currentUser: CurrentUserPayload;
  let gameSessionRepository: GameSessionRepository;

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
          entities: [
            GameSystemOrmEntity,
            UserProfileOrmEntity,
            GameSessionOrmEntity,
            SessionPlayerOrmEntity,
          ],
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
        req.user = currentUser;
        next();
      },
    );
    await app.init();

    gameSessionRepository = moduleRef.get(GameSessionRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = ADMIN_USER;
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
    const oversized = Buffer.alloc(101 * 1024 * 1024, 'a');

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

  async function createGameSystem(name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/game-systems')
      .field('name', name)
      .field('description', '')
      .field('adaptedForChildren', 'false')
      .field('characterSheetSchema', validCharacterSheetSchema())
      .field('mechanicalActions', validMechanicalActions())
      .attach('rulesFile', MINIMAL_PDF, {
        filename: 'rules.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  describe('DELETE /game-systems/:id', () => {
    it('deletes a game system with zero linked sessions and actually removes it', async () => {
      const id = await createGameSystem('JdR sans partie');

      const deleteResponse = await request(app.getHttpServer()).delete(
        `/game-systems/${id}`,
      );
      expect(deleteResponse.status).toBe(204);

      const getResponse = await request(app.getHttpServer()).get(
        `/game-systems/${id}`,
      );
      expect(getResponse.status).toBe(404);
    });

    it('rejects deleting a game system referenced by at least one session, with a clear specific message', async () => {
      const id = await createGameSystem('JdR avec une partie');
      await gameSessionRepository.save(
        GameSession.create({
          id: 'session-blocking-deletion',
          gameSystemId: id,
          name: 'Une partie en cours',
          inviteCode: 'ZZZZ99',
          createdByUserId: ADMIN_USER.id,
          status: 'waiting_for_players',
        }),
      );

      const response = await request(app.getHttpServer()).delete(
        `/game-systems/${id}`,
      );

      expect(response.status).toBe(409);
      expect((response.body as { message: string }).message).toBe(
        'Ce JdR est utilisé par au moins une partie et ne peut pas être supprimé.',
      );

      const getResponse = await request(app.getHttpServer()).get(
        `/game-systems/${id}`,
      );
      expect(getResponse.status).toBe(200);
    });

    it('rejects deletion even when the only referencing session is not active (any session ever, not just currently-active ones)', async () => {
      const id = await createGameSystem('JdR avec une partie terminee');
      await gameSessionRepository.save(
        GameSession.create({
          id: 'session-narrating-blocking-deletion',
          gameSystemId: id,
          name: 'Une partie deja bien avancee',
          inviteCode: 'YYYY88',
          createdByUserId: ADMIN_USER.id,
          status: 'narrating',
        }),
      );

      const response = await request(app.getHttpServer()).delete(
        `/game-systems/${id}`,
      );

      expect(response.status).toBe(409);
    });

    it('rejects deletion for a non-admin caller (403) even with zero linked sessions', async () => {
      const id = await createGameSystem('JdR proteger des non-admins');

      currentUser = NON_ADMIN_USER;
      const response = await request(app.getHttpServer()).delete(
        `/game-systems/${id}`,
      );

      expect(response.status).toBe(403);
    });
  });
});
