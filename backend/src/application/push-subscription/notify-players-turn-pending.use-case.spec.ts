import {
  PushNotificationPayload,
  PushNotificationPort,
} from '../../domain/push-subscription/push-notification.port';
import { PushSubscription } from '../../domain/push-subscription/push-subscription';
import { TurnResolvedEvent } from '../../domain/session/turn-resolved.event';
import { InMemoryPushSubscriptionRepository } from './in-memory-push-subscription.repository';
import { NotifyPlayersTurnPendingUseCase } from './notify-players-turn-pending.use-case';

/** Records every send() call so tests can assert deliveries without a real push call. */
class RecordingPushNotificationPort extends PushNotificationPort {
  public calls: {
    subscription: PushSubscription;
    payload: PushNotificationPayload;
  }[] = [];

  send(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<void> {
    this.calls.push({ subscription, payload });
    return Promise.resolve();
  }
}

function buildSubscription(userId: string, endpoint: string) {
  return PushSubscription.create({
    userId,
    endpoint,
    keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
  });
}

describe('NotifyPlayersTurnPendingUseCase', () => {
  it('sends a minimal, non-narrative notification to every subscription of every player of the event', async () => {
    const player1Subscription = buildSubscription(
      'user-1',
      'https://push.example.com/subscription/1',
    );
    const player2Subscription = buildSubscription(
      'user-2',
      'https://push.example.com/subscription/2',
    );
    const repository = new InMemoryPushSubscriptionRepository([
      player1Subscription,
      player2Subscription,
    ]);
    const pushNotificationPort = new RecordingPushNotificationPort();
    const useCase = new NotifyPlayersTurnPendingUseCase(
      repository,
      pushNotificationPort,
    );
    const event = new TurnResolvedEvent('session-1', 'La quete du dragon', 2, [
      'user-1',
      'user-2',
    ]);

    await useCase.execute(event);

    expect(pushNotificationPort.calls).toHaveLength(2);
    expect(pushNotificationPort.calls[0].subscription.id).toBe(
      player1Subscription.id,
    );
    expect(pushNotificationPort.calls[0].payload).toEqual({
      title: 'À toi de jouer !',
      body: "C'est ton tour dans La quete du dragon.",
      url: '/sessions/session-1',
    });
    // No narration text leaks into the push payload (CLAUDE.md).
    expect(JSON.stringify(pushNotificationPort.calls[0].payload)).not.toMatch(
      /narrat/i,
    );
  });

  it('sends to every device of a player subscribed on multiple browsers', async () => {
    const desktopSubscription = buildSubscription(
      'user-1',
      'https://push.example.com/subscription/desktop',
    );
    const mobileSubscription = buildSubscription(
      'user-1',
      'https://push.example.com/subscription/mobile',
    );
    const repository = new InMemoryPushSubscriptionRepository([
      desktopSubscription,
      mobileSubscription,
    ]);
    const pushNotificationPort = new RecordingPushNotificationPort();
    const useCase = new NotifyPlayersTurnPendingUseCase(
      repository,
      pushNotificationPort,
    );

    await useCase.execute(
      new TurnResolvedEvent('session-1', 'La quete du dragon', 1, ['user-1']),
    );

    expect(pushNotificationPort.calls).toHaveLength(2);
  });

  it('does nothing for a player without a registered subscription', async () => {
    const repository = new InMemoryPushSubscriptionRepository();
    const pushNotificationPort = new RecordingPushNotificationPort();
    const useCase = new NotifyPlayersTurnPendingUseCase(
      repository,
      pushNotificationPort,
    );

    await useCase.execute(
      new TurnResolvedEvent('session-1', 'La quete du dragon', 1, ['user-1']),
    );

    expect(pushNotificationPort.calls).toHaveLength(0);
  });

  it('keeps notifying the remaining subscriptions when one delivery fails', async () => {
    const failingSubscription = buildSubscription(
      'user-1',
      'https://push.example.com/subscription/expired',
    );
    const workingSubscription = buildSubscription(
      'user-2',
      'https://push.example.com/subscription/working',
    );
    const repository = new InMemoryPushSubscriptionRepository([
      failingSubscription,
      workingSubscription,
    ]);
    class FlakyPushNotificationPort extends RecordingPushNotificationPort {
      send(
        subscription: PushSubscription,
        payload: PushNotificationPayload,
      ): Promise<void> {
        if (subscription.id === failingSubscription.id) {
          return Promise.reject(new Error('410 Gone'));
        }
        return super.send(subscription, payload);
      }
    }
    const pushNotificationPort = new FlakyPushNotificationPort();
    const useCase = new NotifyPlayersTurnPendingUseCase(
      repository,
      pushNotificationPort,
    );

    await useCase.execute(
      new TurnResolvedEvent('session-1', 'La quete du dragon', 1, [
        'user-1',
        'user-2',
      ]),
    );

    expect(pushNotificationPort.calls).toHaveLength(1);
    expect(pushNotificationPort.calls[0].subscription.id).toBe(
      workingSubscription.id,
    );
  });
});
