import { AppSetting } from './app-setting';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class AppSettingRepository {
  abstract findByKey(key: string): Promise<AppSetting | null>;
  abstract save(setting: AppSetting): Promise<void>;
}
