import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PushSubscriptionRepository } from '../../domain/push-subscription/push-subscription.repository';

/**
 * Unregisters a browser Web Push subscription. Only the user who owns the
 * subscription may delete it - see `session-engine`/`character` for the
 * same "resource owner only" convention.
 */
@Injectable()
export class DeletePushSubscriptionUseCase {
  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const subscription = await this.pushSubscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Push subscription not found');
    }
    if (subscription.userId !== userId) {
      throw new ForbiddenException(
        "Cannot delete another user's push subscription",
      );
    }

    await this.pushSubscriptionRepository.deleteById(id);
  }
}
