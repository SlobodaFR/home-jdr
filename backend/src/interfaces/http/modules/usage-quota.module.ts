import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetUsageStatsUseCase } from '../../../application/usage-quota/get-usage-stats.use-case';
import { UpdateAppSettingUseCase } from '../../../application/usage-quota/update-app-setting.use-case';
import { ClockPort } from '../../../domain/shared/clock.port';
import { AppSettingRepository } from '../../../domain/usage-quota/app-setting.repository';
import { LlmUsageRecordRepository } from '../../../domain/usage-quota/llm-usage-record.repository';
import { UsageQuotaPort } from '../../../domain/usage-quota/usage-quota.port';
import { SystemClockAdapter } from '../../../infrastructure/shared/system-clock.adapter';
import { AppSettingOrmEntity } from '../../../infrastructure/persistence/entities/app-setting.orm-entity';
import { LlmUsageRecordOrmEntity } from '../../../infrastructure/persistence/entities/llm-usage-record.orm-entity';
import { TypeOrmAppSettingRepository } from '../../../infrastructure/persistence/repositories/typeorm-app-setting.repository';
import { TypeOrmLlmUsageRecordRepository } from '../../../infrastructure/persistence/repositories/typeorm-llm-usage-record.repository';
import { TypeOrmUsageQuotaAdapter } from '../../../infrastructure/usage-quota/typeorm-usage-quota.adapter';
import { AdminUsageController } from '../controllers/admin-usage.controller';
import { UserProfileModule } from './user-profile.module';

/**
 * Owns the LLM cost guard-rails (see `tasks/08-admin-quotas-cost-guardrails.md`):
 * the `UsageQuotaPort` binding consumed by `ResolveSceneUseCase`/
 * `MaintainRollingSummaryUseCase` (via `SessionModule` importing this
 * module), and the admin-only `/api/admin/usage` +
 * `/api/admin/settings/daily-llm-quota` endpoints.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LlmUsageRecordOrmEntity, AppSettingOrmEntity]),
    UserProfileModule,
  ],
  controllers: [AdminUsageController],
  providers: [
    {
      provide: LlmUsageRecordRepository,
      useClass: TypeOrmLlmUsageRecordRepository,
    },
    { provide: AppSettingRepository, useClass: TypeOrmAppSettingRepository },
    { provide: ClockPort, useClass: SystemClockAdapter },
    { provide: UsageQuotaPort, useClass: TypeOrmUsageQuotaAdapter },
    GetUsageStatsUseCase,
    UpdateAppSettingUseCase,
  ],
  exports: [UsageQuotaPort],
})
export class UsageQuotaModule {}
