import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PushNotificationPayload,
  PushNotificationPort,
} from '../../domain/push-subscription/push-notification.port';
import { PushSubscription } from '../../domain/push-subscription/push-subscription';
import {
  TURN_RESOLVED_EVENT,
  TurnResolvedEvent,
} from '../../domain/session/turn-resolved.event';
import { InMemoryGameSessionRepository } from '../session/in-memory-game-session.repository';
import { InMemorySessionPlayerRepository } from '../session/in-memory-session-player.repository';
import { InMemoryTurnResolutionRepository } from '../session/in-memory-turn-resolution.repository';
import { InMemoryTurnSubmissionRepository } from '../session/in-memory-turn-submission.repository';
import { SubmitTurnActionUseCase } from '../session/submit-turn-action.use-case';
import { GameSession } from '../../domain/session/game-session';
import { SessionPlayer } from '../../domain/session/session-player';
import { SceneResolverPort } from '../../domain/session/scene-resolver.port';
import { DeletePushSubscriptionUseCase } from './delete-push-subscription.use-case';
import { InMemoryPushSubscriptionRepository } from './in-memory-push-subscription.repository';
import { NotifyPlayersTurnPendingUseCase } from './notify-players-turn-pending.use-case';
import { RegisterPushSubscriptionUseCase } from './register-push-subscription.use-case';

/** Records every send() call - stands in for `WebPushAdapter` (mocked, no real push call). */
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

class ImmediateSceneResolver extends SceneResolverPort {
  resolve(): ReturnType<SceneResolverPort['resolve']> {
    return Promise.resolve({ narrationText: 'La porte grince et cede.' });
  }
}

/**
 * `eventEmitter.emit()` (used by `SubmitTurnActionUseCase`, matching
 * production code - not `emitAsync`) fires listeners without awaiting their
 * returned promise. Flushing past a macrotask boundary lets the listener's
 * internal awaits (repository lookup, then push send) settle before
 * assertions run.
 */
function flushAsyncListeners(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * End-to-end (application-layer) coverage of `tasks/06-notifications-push.md`
 * acceptance criteria:
 *  - a registered push subscription actually receives a notification when a
 *    turn resolves (the `WaitingForPlayerEvent`-equivalent - `03-session-engine`
 *    models this as `TurnResolvedEvent`, see `turn-resolved.event.ts`),
 *  - deleting a subscription stops future notifications to it.
 *
 * Uses a real `EventEmitter2` (no NestJS bootstrapping needed) to wire
 * `SubmitTurnActionUseCase` (the emitter) to `NotifyPlayersTurnPendingUseCase`
 * (the listener) exactly as `PushSubscriptionModule`/`SessionModule` do via
 * `@OnEvent`, and a fake `PushNotificationPort` instead of `WebPushAdapter`.
 */
describe('push notification flow (register -> turn resolves -> notified -> delete -> not notified)', () => {
  it('notifies a registered subscription when a turn resolves, and stops after it is deleted', async () => {
    const session = GameSession.create({
      gameSystemId: 'game-system-1',
      name: 'La quete du dragon',
      inviteCode: 'XK4R2P',
      createdByUserId: 'user-1',
    });
    const gameSessionRepository = new InMemoryGameSessionRepository([session]);
    const sessionPlayerRepository = new InMemorySessionPlayerRepository([
      SessionPlayer.create({
        sessionId: session.id,
        userId: 'user-1',
        characterId: 'character-1',
      }),
    ]);
    const eventEmitter = new EventEmitter2();
    const submitTurnAction = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
      new ImmediateSceneResolver(),
      eventEmitter,
    );

    const pushSubscriptionRepository = new InMemoryPushSubscriptionRepository();
    const pushNotificationPort = new RecordingPushNotificationPort();
    const registerPushSubscription = new RegisterPushSubscriptionUseCase(
      pushSubscriptionRepository,
    );
    const deletePushSubscription = new DeletePushSubscriptionUseCase(
      pushSubscriptionRepository,
    );
    const notifyPlayersTurnPending = new NotifyPlayersTurnPendingUseCase(
      pushSubscriptionRepository,
      pushNotificationPort,
    );
    eventEmitter.on(TURN_RESOLVED_EVENT, (event: TurnResolvedEvent) => {
      void notifyPlayersTurnPending.execute(event);
    });

    const subscription = await registerPushSubscription.execute({
      userId: 'user-1',
      endpoint: 'https://push.example.com/subscription/abc',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    });

    await submitTurnAction.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: "J'ouvre la porte",
    });
    await flushAsyncListeners();

    expect(pushNotificationPort.calls).toHaveLength(1);
    expect(pushNotificationPort.calls[0].subscription.id).toBe(subscription.id);
    expect(pushNotificationPort.calls[0].payload.body).toContain(
      'La quete du dragon',
    );
    expect(pushNotificationPort.calls[0].payload.body).not.toContain(
      'La porte grince',
    );

    await deletePushSubscription.execute(subscription.id, 'user-1');

    const secondSubmission = new SubmitTurnActionUseCase(
      gameSessionRepository,
      sessionPlayerRepository,
      new InMemoryTurnSubmissionRepository(),
      new InMemoryTurnResolutionRepository(),
      new ImmediateSceneResolver(),
      eventEmitter,
    );
    await secondSubmission.execute({
      sessionId: session.id,
      userId: 'user-1',
      actionText: 'Nouvelle action',
    });
    await flushAsyncListeners();

    expect(pushNotificationPort.calls).toHaveLength(1);
  });
});
