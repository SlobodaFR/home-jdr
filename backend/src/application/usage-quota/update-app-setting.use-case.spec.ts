import { InMemoryAppSettingRepository } from './in-memory-app-setting.repository';
import { UpdateAppSettingUseCase } from './update-app-setting.use-case';

describe('UpdateAppSettingUseCase', () => {
  it('creates a new setting when none exists yet', async () => {
    const repository = new InMemoryAppSettingRepository();
    const useCase = new UpdateAppSettingUseCase(repository);

    const updated = await useCase.execute('daily-llm-quota', '80');

    expect(updated.key).toBe('daily-llm-quota');
    expect(updated.value).toBe('80');
    await expect(
      repository.findByKey('daily-llm-quota'),
    ).resolves.toMatchObject({
      value: '80',
    });
  });

  it('overwrites an existing setting value', async () => {
    const repository = new InMemoryAppSettingRepository();
    const useCase = new UpdateAppSettingUseCase(repository);
    await useCase.execute('daily-llm-quota', '80');

    const updated = await useCase.execute('daily-llm-quota', '120');

    expect(updated.value).toBe('120');
    await expect(
      repository.findByKey('daily-llm-quota'),
    ).resolves.toMatchObject({
      value: '120',
    });
  });
});
