import { randomUUID } from 'crypto';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionProps {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: Date;
}

export type NewPushSubscriptionProps = Omit<
  PushSubscriptionProps,
  'id' | 'createdAt'
> & {
  id?: string;
  createdAt?: Date;
};

/**
 * A browser Web Push subscription (one per device/browser install) for a
 * home-auth user - see `tasks/06-notifications-push.md`. `endpoint` and
 * `keys` come verbatim from the browser's
 * `PushSubscription.toJSON()`/`PushManager.subscribe()` result.
 */
export class PushSubscription {
  private readonly props: PushSubscriptionProps;

  private constructor(props: PushSubscriptionProps) {
    if (!props.userId.trim()) {
      throw new Error('userId is required');
    }
    if (!props.endpoint.trim()) {
      throw new Error('endpoint is required');
    }
    if (!props.keys.p256dh.trim() || !props.keys.auth.trim()) {
      throw new Error('keys.p256dh and keys.auth are required');
    }
    this.props = { ...props, keys: { ...props.keys } };
  }

  static create(props: NewPushSubscriptionProps): PushSubscription {
    return new PushSubscription({
      ...props,
      id: props.id ?? randomUUID(),
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get endpoint(): string {
    return this.props.endpoint;
  }

  get keys(): PushSubscriptionKeys {
    return { ...this.props.keys };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
