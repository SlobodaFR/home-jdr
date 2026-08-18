import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PushNotificationPort } from '../../domain/push-subscription/push-notification.port';
import { PushSubscriptionRepository } from '../../domain/push-subscription/push-subscription.repository';
import {
  TURN_RESOLVED_EVENT,
  TurnResolvedEvent,
} from '../../domain/session/turn-resolved.event';

/**
 * Listens for `TurnResolvedEvent` (emitted by `SubmitTurnActionUseCase`,
 * see `03-session-engine`) and pushes a minimal, non-narrative notification
 * to every subscribed device of every player whose turn is now pending -
 * see `CLAUDE.md` "pas de contenu narratif sensible dans le payload push".
 *
 * A failure to deliver to one subscription (expired endpoint, network
 * error...) is logged and does not interrupt notifying the others.
 */
@Injectable()
export class NotifyPlayersTurnPendingUseCase {
  private readonly logger = new Logger(NotifyPlayersTurnPendingUseCase.name);

  constructor(
    private readonly pushSubscriptionRepository: PushSubscriptionRepository,
    private readonly pushNotificationPort: PushNotificationPort,
  ) {}

  @OnEvent(TURN_RESOLVED_EVENT)
  async handleTurnResolved(event: TurnResolvedEvent): Promise<void> {
    await this.execute(event);
  }

  async execute(event: TurnResolvedEvent): Promise<void> {
    const payload = {
      title: 'À toi de jouer !',
      body: `C'est ton tour dans ${event.sessionName}.`,
      url: `/sessions/${event.sessionId}`,
    };

    for (const userId of event.playerUserIds) {
      const subscriptions =
        await this.pushSubscriptionRepository.findByUserId(userId);
      for (const subscription of subscriptions) {
        try {
          await this.pushNotificationPort.send(subscription, payload);
        } catch (error) {
          this.logger.warn(
            `Failed to push-notify subscription ${subscription.id} for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
  }
}
