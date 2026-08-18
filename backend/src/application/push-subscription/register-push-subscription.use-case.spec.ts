import { InMemoryPushSubscriptionRepository } from './in-memory-push-subscription.repository';
import { RegisterPushSubscriptionUseCase } from './register-push-subscription.use-case';

describe('RegisterPushSubscriptionUseCase', () => {
  const input = {
    userId: 'user-1',
    endpoint: 'https://push.example.com/subscription/abc',
    keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
  };

  it('persists a new subscription', async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);

    const subscription = await useCase.execute(input);

    expect(subscription.userId).toBe('user-1');
    expect(subscription.endpoint).toBe(input.endpoint);
    await expect(repository.findById(subscription.id)).resolves.not.toBeNull();
  });

  it('is idempotent: registering the same endpoint twice for the same user does not duplicate it', async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    await expect(repository.findByUserId('user-1')).resolves.toHaveLength(1);
  });

  it('allows the same endpoint to be registered separately for a different user', async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new RegisterPushSubscriptionUseCase(repository);

    await useCase.execute(input);
    await useCase.execute({ ...input, userId: 'user-2' });

    await expect(repository.findByUserId('user-1')).resolves.toHaveLength(1);
    await expect(repository.findByUserId('user-2')).resolves.toHaveLength(1);
  });
});
