import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  DailyUsage,
  GetUsageStatsUseCase,
  UsageStats,
} from '../../../application/usage-quota/get-usage-stats.use-case';
import { UpdateAppSettingUseCase } from '../../../application/usage-quota/update-app-setting.use-case';
import { DAILY_LLM_QUOTA_SETTING_KEY } from '../../../domain/usage-quota/daily-llm-quota';
import { UpdateDailyLlmQuotaDto } from '../dto/update-daily-llm-quota.dto';
import { AdminRoleGuard } from '../guards/admin-role.guard';

interface UsageStatsResponse {
  dailyQuota: number;
  usedToday: number;
  usedPercent: number;
  totalCallsToday: number;
  trend: DailyUsage[];
}

function toResponse(stats: UsageStats): UsageStatsResponse {
  return {
    dailyQuota: stats.dailyQuota,
    usedToday: stats.usedToday,
    usedPercent: stats.usedPercent,
    totalCallsToday: stats.totalCallsToday,
    trend: stats.trend,
  };
}

/** Admin-only usage dashboard + quota configuration (see `tasks/08-admin-quotas-cost-guardrails.md`). */
@UseGuards(AdminRoleGuard)
@Controller('admin')
export class AdminUsageController {
  constructor(
    private readonly getUsageStats: GetUsageStatsUseCase,
    private readonly updateAppSetting: UpdateAppSettingUseCase,
  ) {}

  @Get('usage')
  async usage(): Promise<UsageStatsResponse> {
    const stats = await this.getUsageStats.execute();
    return toResponse(stats);
  }

  @Patch('settings/daily-llm-quota')
  async updateDailyLlmQuota(
    @Body() dto: UpdateDailyLlmQuotaDto,
  ): Promise<{ key: string; value: string }> {
    const setting = await this.updateAppSetting.execute(
      DAILY_LLM_QUOTA_SETTING_KEY,
      String(dto.value),
    );
    return { key: setting.key, value: setting.value };
  }
}
