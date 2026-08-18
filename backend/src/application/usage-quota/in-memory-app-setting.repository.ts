import { AppSetting } from '../../domain/usage-quota/app-setting';
import { AppSettingRepository } from '../../domain/usage-quota/app-setting.repository';

/** Test double shared by use-case/adapter specs that need an `AppSettingRepository`. */
export class InMemoryAppSettingRepository extends AppSettingRepository {
  constructor(private settings: AppSetting[] = []) {
    super();
  }

  findByKey(key: string): Promise<AppSetting | null> {
    return Promise.resolve(
      this.settings.find((setting) => setting.key === key) ?? null,
    );
  }

  save(setting: AppSetting): Promise<void> {
    this.settings = [
      ...this.settings.filter((existing) => existing.key !== setting.key),
      setting,
    ];
    return Promise.resolve();
  }
}
