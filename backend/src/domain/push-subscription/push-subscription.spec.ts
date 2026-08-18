import { PushSubscription } from './push-subscription';

describe('PushSubscription', () => {
  function props(
    overrides: Partial<Parameters<typeof PushSubscription.create>[0]> = {},
  ) {
    return {
      userId: 'user-1',
      endpoint: 'https://push.example.com/subscription/abc',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      ...overrides,
    };
  }

  it('creates a subscription with a generated id and createdAt', () => {
    const subscription = PushSubscription.create(props());

    expect(subscription.id).toBeTruthy();
    expect(subscription.userId).toBe('user-1');
    expect(subscription.endpoint).toBe(
      'https://push.example.com/subscription/abc',
    );
    expect(subscription.keys).toEqual({
      p256dh: 'p256dh-value',
      auth: 'auth-value',
    });
    expect(subscription.createdAt).toBeInstanceOf(Date);
  });

  it('accepts an explicit id and createdAt (rehydration from persistence)', () => {
    const createdAt = new Date('2026-01-01');
    const subscription = PushSubscription.create({
      ...props(),
      id: 'subscription-1',
      createdAt,
    });

    expect(subscription.id).toBe('subscription-1');
    expect(subscription.createdAt).toBe(createdAt);
  });

  it('rejects a blank userId', () => {
    expect(() => PushSubscription.create(props({ userId: '   ' }))).toThrow();
  });

  it('rejects a blank endpoint', () => {
    expect(() => PushSubscription.create(props({ endpoint: '   ' }))).toThrow();
  });

  it('rejects blank keys', () => {
    expect(() =>
      PushSubscription.create(
        props({ keys: { p256dh: '', auth: 'auth-value' } }),
      ),
    ).toThrow();
    expect(() =>
      PushSubscription.create(
        props({ keys: { p256dh: 'p256dh-value', auth: '' } }),
      ),
    ).toThrow();
  });

  it('returns a defensive copy of keys', () => {
    const subscription = PushSubscription.create(props());

    const keys = subscription.keys;
    keys.p256dh = 'tampered';

    expect(subscription.keys.p256dh).toBe('p256dh-value');
  });
});
