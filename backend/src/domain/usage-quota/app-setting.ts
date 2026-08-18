export interface AppSettingProps {
  key: string;
  value: string;
}

/**
 * Simple admin-editable key/value store (see
 * `tasks/08-admin-quotas-cost-guardrails.md`). Used today for the daily LLM
 * quota override (`DAILY_LLM_QUOTA_SETTING_KEY`), with a fallback to the
 * `DAILY_LLM_QUOTA` env var when no row exists - deliberately generic so it
 * can host other admin-tunable settings later without a schema change.
 */
export class AppSetting {
  private readonly props: AppSettingProps;

  private constructor(props: AppSettingProps) {
    const key = props.key.trim();
    if (!key) {
      throw new Error('AppSetting key is required');
    }
    this.props = { key, value: props.value };
  }

  static create(props: AppSettingProps): AppSetting {
    return new AppSetting(props);
  }

  get key(): string {
    return this.props.key;
  }

  get value(): string {
    return this.props.value;
  }
}
