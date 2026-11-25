import { logFailingRequest } from './logging-e2e-fixture.contract';

describe('logging end to end: negative control', () => {
  // Negative control: the same scenario without the whitelist must leak, otherwise the test above proves nothing.
  it('would leak the query parameters with pino default error serializer', async () => {
    const lines = await logFailingRequest((options) => {
      delete options.serializers.err;
    });

    expect(lines.join('')).toContain('alice@example.com');
  });
});
