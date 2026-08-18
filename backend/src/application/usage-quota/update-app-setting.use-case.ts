import { Injectable } from '@nestjs/common';
import { AppSetting } from '../../domain/usage-quota/app-setting';
import { AppSettingRepository } from '../../domain/usage-quota/app-setting.repository';

/**
 * Admin-only setting update (see `interfaces/http/guards/admin-role.guard.ts`).
 * Takes effect immediately: `UsageQuotaPort.checkQuotaAvailable()` reads the
 * `AppSetting` row fresh on every call, no redeploy/restart needed.
 */
@Injectable()
export class UpdateAppSettingUseCase {
  constructor(private readonly appSettingRepository: AppSettingRepository) {}

  async execute(key: string, value: string): Promise<AppSetting> {
    const setting = AppSetting.create({ key, value });
    await this.appSettingRepository.save(setting);
    return setting;
  }
}
