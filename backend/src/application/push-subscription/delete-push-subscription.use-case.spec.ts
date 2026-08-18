import { PushSubscription } from '../../domain/push-subscription/push-subscription';
import { DeletePushSubscriptionUseCase } from './delete-push-subscription.use-case';
import { InMemoryPushSubscriptionRepository } from './in-memory-push-subscription.repository';

describe('DeletePushSubscriptionUseCase', () => {
  function buildSubscription(overrides: { userId?: string } = {}) {
    return PushSubscription.create({
      userId: overrides.userId ?? 'user-1',
      endpoint: 'https://push.example.com/subscription/abc',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });
  }

  it('deletes a subscription owned by the caller', async () => {
    const subscription = buildSubscription();
    const repository = new InMemoryPushSubscriptionRepository([subscription]);
    const useCase = new DeletePushSubscriptionUseCase(repository);

    await useCase.execute(subscription.id, 'user-1');

    await expect(repository.findById(subscription.id)).resolves.toBeNull();
  });

  it('rejects deleting a subscription owned by another user', async () => {
    const subscription = buildSubscription({ userId: 'user-1' });
    const repository = new InMemoryPushSubscriptionRepository([subscription]);
    const useCase = new DeletePushSubscriptionUseCase(repository);

    await expect(useCase.execute(subscription.id, 'user-2')).rejects.toThrow();
    await expect(repository.findById(subscription.id)).resolves.not.toBeNull();
  });

  it('rejects deleting a subscription that does not exist', async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const useCase = new DeletePushSubscriptionUseCase(repository);

    await expect(useCase.execute('missing-id', 'user-1')).rejects.toThrow();
  });
});
