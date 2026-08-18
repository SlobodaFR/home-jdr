import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { ClockPort } from '../../../domain/shared/clock.port';
import { LlmUsageRecordRepository } from '../../../domain/usage-quota/llm-usage-record.repository';
import { LlmUsageRecord } from '../../../domain/usage-quota/llm-usage-record';
import { AppSettingOrmEntity } from '../../../infrastructure/persistence/entities/app-setting.orm-entity';
import { LlmUsageRecordOrmEntity } from '../../../infrastructure/persistence/entities/llm-usage-record.orm-entity';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { UsageQuotaModule } from '../modules/usage-quota.module';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

/** Deterministic stand-in for `SystemClockAdapter`, so "today" is stable across the suite. */
class FixedClockAdapter extends ClockPort {
  now(): Date {
    return new Date(2026, 2, 10, 12, 0, 0);
  }
}

const ADMIN_USER: CurrentUserPayload = {
  id: 'admin-1',
  email: 'admin@test.dev',
  name: 'Admin',
};

interface UsageStatsApiResponse {
  dailyQuota: number;
  usedToday: number;
  usedPercent: number;
  totalCallsToday: number;
  trend: { date: string; totalCalls: number }[];
}

/**
 * Exercises the real HTTP <-> use-case <-> TypeORM plumbing for the admin
 * usage dashboard (see `tasks/08-admin-quotas-cost-guardrails.md`) -
 * "Le tableau de bord admin affiche un total cohérent avec les
 * LlmUsageRecord réellement enregistrés (test d'intégration)".
 */
describe('AdminUsageController (integration)', () => {
  let app: INestApplication;
  let llmUsageRecordRepository: LlmUsageRecordRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({ ADMIN_EMAILS: 'admin@test.dev', DAILY_LLM_QUOTA: '10' }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [
            LlmUsageRecordOrmEntity,
            AppSettingOrmEntity,
            UserProfileOrmEntity,
          ],
        }),
        UsageQuotaModule,
      ],
    })
      .overrideProvider(ClockPort)
      .useClass(FixedClockAdapter)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use(
      (req: { user?: CurrentUserPayload }, _res: unknown, next: () => void) => {
        req.user = ADMIN_USER;
        next();
      },
    );
    await app.init();

    llmUsageRecordRepository = app.get(LlmUsageRecordRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports a total consistent with the actually-recorded LlmUsageRecords', async () => {
    await llmUsageRecordRepository.save(
      LlmUsageRecord.create({
        sessionId: 'session-1',
        turnNumber: 1,
        provider: 'claude',
        callType: 'scene_resolution',
        occurredAt: new Date(2026, 2, 10, 9, 0, 0),
      }),
    );
    await llmUsageRecordRepository.save(
      LlmUsageRecord.create({
        sessionId: 'session-1',
        turnNumber: 1,
        provider: 'claude',
        callType: 'summary',
        occurredAt: new Date(2026, 2, 10, 9, 5, 0),
      }),
    );

    const response = await request(app.getHttpServer()).get('/admin/usage');

    expect(response.status).toBe(200);
    const body = response.body as UsageStatsApiResponse;
    expect(body.totalCallsToday).toBe(2);
    expect(body.usedToday).toBe(1);
    expect(body.dailyQuota).toBe(10);
    expect(body.trend).toHaveLength(7);
  });

  it('updates the daily quota and reflects it immediately on the next usage read', async () => {
    const updateResponse = await request(app.getHttpServer())
      .patch('/admin/settings/daily-llm-quota')
      .send({ value: 25 });

    expect(updateResponse.status).toBe(200);
    expect((updateResponse.body as { value: string }).value).toBe('25');

    const usageResponse = await request(app.getHttpServer()).get(
      '/admin/usage',
    );
    expect((usageResponse.body as UsageStatsApiResponse).dailyQuota).toBe(25);
  });

  it('rejects an invalid quota value', async () => {
    const response = await request(app.getHttpServer())
      .patch('/admin/settings/daily-llm-quota')
      .send({ value: 0 });

    expect(response.status).toBe(400);
  });
});
