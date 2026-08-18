import { AppSetting } from './app-setting';

describe('AppSetting', () => {
  it('creates a key/value setting', () => {
    const setting = AppSetting.create({ key: 'daily-llm-quota', value: '80' });

    expect(setting.key).toBe('daily-llm-quota');
    expect(setting.value).toBe('80');
  });

  it('rejects a blank key', () => {
    expect(() => AppSetting.create({ key: '   ', value: '80' })).toThrow();
  });
});
