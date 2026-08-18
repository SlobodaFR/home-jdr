import { PushSubscriptionKeys } from '../domain/push-notification';

export type Platform = 'ios' | 'android' | 'other';

/** Simple platform sniffing, only used to pick the right "add to home screen" copy. */
export function detectPlatform(userAgent: string = navigator.userAgent): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  // iPadOS 13+ reports itself as a Mac unless "Request Desktop Website" is
  // off - the touch-points check is the standard disambiguator from a real
  // Mac (which has none).
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'other';
}

/** True once the app runs installed (not in a regular browser tab). */
export function isStandaloneDisplayMode(): boolean {
  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS/iPadOS Safari legacy, non-standard property - has no
  // `(display-mode: standalone)` media query support pre-iOS 16.4.
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * VAPID public keys are URL-safe base64; `PushManager.subscribe` wants raw
 * bytes. Built with `new Uint8Array(length)` (backed by a plain
 * `ArrayBuffer`) rather than `Uint8Array.from` so the result satisfies
 * `BufferSource`/`applicationServerKey` typing (which excludes the wider
 * `ArrayBufferLike`/`SharedArrayBuffer`-backed variant).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function toKeys(subscription: PushSubscription): PushSubscriptionKeys {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) {
    throw new Error('Push subscription is missing its encryption keys');
  }
  return { p256dh, auth };
}

export const pushNotificationManager = {
  isPushSupported,
  isStandaloneDisplayMode,
  detectPlatform,

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  },

  async subscribe(
    vapidPublicKey: string,
  ): Promise<{ endpoint: string; keys: PushSubscriptionKeys }> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast needed: `Uint8Array`'s generic ArrayBufferLike parameter and
      // the DOM lib's `BufferSource`/`ArrayBufferView<ArrayBuffer>` typing
      // don't line up as of TS 5.7+, even though this is exactly the shape
      // `PushManager.subscribe` expects at runtime.
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
    return { endpoint: subscription.endpoint, keys: toKeys(subscription) };
  },

  async unsubscribe(): Promise<void> {
    const subscription = await this.getExistingSubscription();
    await subscription?.unsubscribe();
  },
};
