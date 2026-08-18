import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectPlatform,
  isStandaloneDisplayMode,
  pushNotificationManager,
  urlBase64ToUint8Array,
} from './push-notification-manager';

describe('detectPlatform', () => {
  it('detects iPhone/iPad user agents as iOS', () => {
    expect(
      detectPlatform(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      ),
    ).toBe('ios');
  });

  it('detects Android user agents as android', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
  });

  it('falls back to other for desktop user agents', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
    });
    expect(
      detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    ).toBe('other');
  });

  it('detects a touch-capable "Macintosh" UA (iPadOS 13+) as iOS', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });
    expect(
      detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6)'),
    ).toBe('ios');
  });
});

describe('isStandaloneDisplayMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false in a regular browser tab', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);

    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it('returns true when display-mode: standalone matches', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);

    expect(isStandaloneDisplayMode()).toBe(true);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes a URL-safe base64 VAPID key into raw bytes', () => {
    // "hello" base64-encoded, URL-safe alphabet
    const bytes = urlBase64ToUint8Array('aGVsbG8');

    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });
});

describe('pushNotificationManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('subscribe', () => {
    it('subscribes via the service worker registration and returns endpoint + keys', async () => {
      const fakeSubscription = {
        endpoint: 'https://push.example.com/subscription/abc',
        toJSON: () => ({ keys: { p256dh: 'p256dh-value', auth: 'auth-value' } }),
      };
      const registration = {
        pushManager: { subscribe: vi.fn().mockResolvedValue(fakeSubscription) },
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { ready: Promise.resolve(registration) },
      });

      const result = await pushNotificationManager.subscribe('aGVsbG8');

      expect(result).toEqual({
        endpoint: 'https://push.example.com/subscription/abc',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      });
      expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ userVisibleOnly: true }),
      );
    });

    it('throws when the browser subscription is missing its encryption keys', async () => {
      const fakeSubscription = {
        endpoint: 'https://push.example.com/subscription/abc',
        toJSON: () => ({ keys: undefined }),
      };
      const registration = {
        pushManager: { subscribe: vi.fn().mockResolvedValue(fakeSubscription) },
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { ready: Promise.resolve(registration) },
      });

      await expect(pushNotificationManager.subscribe('aGVsbG8')).rejects.toThrow();
    });
  });

  describe('getExistingSubscription / unsubscribe', () => {
    it('unsubscribes the current subscription when one exists', async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true);
      const registration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue({ unsubscribe }),
        },
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { ready: Promise.resolve(registration) },
        PushManager: {},
      });
      vi.stubGlobal('PushManager', {});

      await pushNotificationManager.unsubscribe();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('is a no-op when there is no existing subscription', async () => {
      const registration = {
        pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
      };
      vi.stubGlobal('navigator', {
        ...navigator,
        serviceWorker: { ready: Promise.resolve(registration) },
        PushManager: {},
      });
      vi.stubGlobal('PushManager', {});

      await expect(pushNotificationManager.unsubscribe()).resolves.toBeUndefined();
    });
  });
});
