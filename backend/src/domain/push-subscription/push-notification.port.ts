import { PushSubscription } from './push-subscription';

/**
 * Minimal, non-narrative payload - see `CLAUDE.md`: no game/narrative
 * content transits a push payload, since it can flow through third-party
 * push services depending on the browser vendor.
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  /** App-relative URL to open on notification click, e.g. `/sessions/:id`. */
  url: string;
}

/**
 * Port (driven side) implemented by the infrastructure layer
 * (`WebPushAdapter`).
 */
export abstract class PushNotificationPort {
  abstract send(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<void>;
}
