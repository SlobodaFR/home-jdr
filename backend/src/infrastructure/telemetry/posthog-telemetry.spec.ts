import { ConfigService } from '@nestjs/config';
import {
  createPostHogTelemetry,
  PostHogClient,
  PostHogTelemetry,
} from './posthog-telemetry';

type CaptureMessage = Parameters<PostHogClient['capture']>[0];

class FakeClient implements PostHogClient {
  readonly captured: CaptureMessage[] = [];
  shutdowns = 0;
  shutdownTimeouts: (number | undefined)[] = [];
  failing = false;

  capture(message: CaptureMessage): void {
    if (this.failing) {
      throw new Error('network');
    }
    this.captured.push(message);
  }

  async shutdown(timeoutMs?: number): Promise<void> {
    this.shutdowns += 1;
    this.shutdownTimeouts.push(timeoutMs);
    return Promise.resolve();
  }
}

const httpRequest = {
  name: 'http_request',
  properties: {
    route: '/api/sessions/:id',
    method: 'GET',
    status: 200,
    duration_ms: 3,
  },
} as const;

describe('PostHogTelemetry', () => {
  it('is disabled without POSTHOG_API_KEY: no client is created, capture is a no-op', () => {
    const factory =
      vi.fn<(apiKey: string, options: unknown) => PostHogClient>();

    const telemetry = createPostHogTelemetry(new ConfigService({}), factory);

    expect(() => {
      telemetry.capture(httpRequest);
    }).not.toThrow();
    expect(factory).not.toHaveBeenCalled();
  });

  it('does not depend on PSEUDONYM_SECRET (startup never blocked by telemetry)', () => {
    expect(() =>
      createPostHogTelemetry(new ConfigService({ POSTHOG_API_KEY: '' })),
    ).not.toThrow();
  });

  it('creates an EU, geoip-free client when a key is set', () => {
    const factory = vi
      .fn<(apiKey: string, options: unknown) => PostHogClient>()
      .mockReturnValue(new FakeClient());

    createPostHogTelemetry(
      new ConfigService({ POSTHOG_API_KEY: 'phc_test' }),
      factory,
    );

    expect(factory).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        host: 'https://eu.i.posthog.com',
        disableGeoip: true,
        flushAt: 20,
        flushInterval: 10_000,
      }),
    );
  });

  it('honours POSTHOG_HOST', () => {
    const factory = vi
      .fn<(apiKey: string, options: unknown) => PostHogClient>()
      .mockReturnValue(new FakeClient());

    createPostHogTelemetry(
      new ConfigService({
        POSTHOG_API_KEY: 'phc_test',
        POSTHOG_HOST: 'https://ph.example.org',
      }),
      factory,
    );

    expect(factory).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ host: 'https://ph.example.org' }),
    );
  });

  it('is always anonymous: random id per event, no person profile, no IP, service name', () => {
    const client = new FakeClient();
    const telemetry = new PostHogTelemetry(client);

    telemetry.capture(httpRequest);
    telemetry.capture(httpRequest);

    const [first, second] = client.captured;
    expect(first.distinctId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.distinctId).not.toBe(second.distinctId);
    expect(first).toEqual({
      distinctId: first.distinctId,
      event: 'http_request',
      properties: {
        route: '/api/sessions/:id',
        method: 'GET',
        status: 200,
        duration_ms: 3,
        service: 'home-jdr',
        version: 'dev',
        $ip: null,
        $process_person_profile: false,
      },
      disableGeoip: true,
    });
  });

  it('adds the release version (APP_VERSION) to every ops event', () => {
    vi.stubEnv('APP_VERSION', '2.5.1');
    const client = new FakeClient();
    const telemetry = new PostHogTelemetry(client);

    telemetry.capture(httpRequest);
    telemetry.capture(httpRequest);

    expect(client.captured.map((c) => c.properties['version'])).toEqual([
      '2.5.1',
      '2.5.1',
    ]);
    vi.unstubAllEnvs();
  });

  it('drops properties that look like personal data', () => {
    const client = new FakeClient();

    new PostHogTelemetry(client).capture({
      ...httpRequest,
      properties: { ...httpRequest.properties, route: 'alice@example.com' },
    });

    expect(client.captured[0].properties).not.toHaveProperty('route');
    expect(JSON.stringify(client.captured)).not.toContain('alice');
  });

  it('never throws into the caller', () => {
    const client = new FakeClient();
    client.failing = true;

    expect(() => {
      new PostHogTelemetry(client).capture(httpRequest);
    }).not.toThrow();
  });

  it('flushes on application shutdown', async () => {
    const client = new FakeClient();

    await new PostHogTelemetry(client).onApplicationShutdown();

    expect(client.shutdowns).toBe(1);
  });

  it('bounds the shutdown flush to 5 s, under the 10 s Docker stop timeout', async () => {
    const client = new FakeClient();

    await new PostHogTelemetry(client).onApplicationShutdown();

    expect(client.shutdownTimeouts).toEqual([5000]);
  });

  it('shuts down cleanly when disabled', async () => {
    await expect(
      new PostHogTelemetry(null).onApplicationShutdown(),
    ).resolves.toBeUndefined();
  });
});
