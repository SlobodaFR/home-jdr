import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import {
  PushNotificationPayload,
  PushNotificationPort,
} from '../../domain/push-subscription/push-notification.port';
import { PushSubscription } from '../../domain/push-subscription/push-subscription';

/**
 * `PushNotificationPort` implementation using the `web-push` library
 * (VAPID-authenticated Web Push, no third-party push service - see
 * `CLAUDE.md` "hors périmètre" and `tasks/06-notifications-push.md`).
 *
 * Not unit-tested here, consistent with this repo's convention of not
 * unit-testing thin infra adapters that wrap a third-party library (see
 * e.g. `JwksAccessTokenVerifier`, `HttpOAuthClient`) - behaviour is covered
 * at the application layer via a `PushNotificationPort` fake (see
 * `NotifyPlayersTurnPendingUseCase.spec.ts`).
 */
@Injectable()
export class WebPushAdapter extends PushNotificationPort {
  private readonly logger = new Logger(WebPushAdapter.name);
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    super();
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    this.configured = Boolean(publicKey && privateKey);
    if (this.configured) {
      webpush.setVapidDetails(
        'mailto:contact@sloboda.fr',
        publicKey!,
        privateKey!,
      );
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not configured - push notifications are disabled.',
      );
    }
  }

  async send(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!this.configured) {
      return;
    }
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
    );
  }
}
