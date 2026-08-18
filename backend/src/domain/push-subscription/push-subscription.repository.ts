import { PushSubscription } from './push-subscription';

/**
 * Port (driven side) implemented by the infrastructure layer.
 */
export abstract class PushSubscriptionRepository {
  abstract findById(id: string): Promise<PushSubscription | null>;
  abstract findByUserId(userId: string): Promise<PushSubscription[]>;
  abstract save(subscription: PushSubscription): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
}
