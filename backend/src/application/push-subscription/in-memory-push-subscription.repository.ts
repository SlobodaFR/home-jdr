import { PushSubscription } from '../../domain/push-subscription/push-subscription';
import { PushSubscriptionRepository } from '../../domain/push-subscription/push-subscription.repository';

/** Test double shared by the push-subscription use-case specs. */
export class InMemoryPushSubscriptionRepository extends PushSubscriptionRepository {
  constructor(private subscriptions: PushSubscription[] = []) {
    super();
  }

  findById(id: string): Promise<PushSubscription | null> {
    return Promise.resolve(
      this.subscriptions.find((subscription) => subscription.id === id) ?? null,
    );
  }

  findByUserId(userId: string): Promise<PushSubscription[]> {
    return Promise.resolve(
      this.subscriptions.filter(
        (subscription) => subscription.userId === userId,
      ),
    );
  }

  save(subscription: PushSubscription): Promise<void> {
    this.subscriptions = [
      ...this.subscriptions.filter(
        (existing) => existing.id !== subscription.id,
      ),
      subscription,
    ];
    return Promise.resolve();
  }

  deleteById(id: string): Promise<void> {
    this.subscriptions = this.subscriptions.filter(
      (subscription) => subscription.id !== id,
    );
    return Promise.resolve();
  }
}
