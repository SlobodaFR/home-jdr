import { Injectable } from '@nestjs/common';
import { PushSubscription } from '../../domain/push-subscription/push-subscription';
import { PushSubscriptionRepository } from '../../domain/push-subscription/push-subscription.repository';

export interface RegisterPushSubscriptionInput {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Registers a browser Web Push subscription for the calling user.
 * Idempotent on (userId, endpoint): re-registering the same endpoint (e.g.
 * the browser re-subscribing after a service worker update) returns the
 * existing subscription instead of creating a duplicate row.
 */
@Injectable()
export class RegisterPushSubscriptionUseCase {
  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
  ) {}

  async execute(
    input: RegisterPushSubscriptionInput,
  ): Promise<PushSubscription> {
    const existingForUser = await this.pushSubscriptionRepository.findByUserId(
      input.userId,
    );
    const alreadyRegistered = existingForUser.find(
      (subscription) => subscription.endpoint === input.endpoint,
    );
    if (alreadyRegistered) {
      return alreadyRegistered;
    }

    const subscription = PushSubscription.create({
      userId: input.userId,
      endpoint: input.endpoint,
      keys: input.keys,
    });
    await this.pushSubscriptionRepository.save(subscription);

    return subscription;
  }
}
