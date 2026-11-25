import { logFailingRequest } from './logging-e2e-fixture.contract';

const errEntries = (lines: string[]) =>
  lines
    .flatMap((line) => line.split('\n'))
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { err?: Record<string, unknown> })
    .flatMap((entry) => (entry.err ? [entry.err] : []));

describe('logging end to end (Nest + nestjs-pino + pino-http)', () => {
  it('logs the real exception through the whitelist: type and stack, no query parameters', async () => {
    const lines = await logFailingRequest();

    const output = lines.join('');
    expect(output).not.toContain('alice@example.com');
    expect(output).not.toContain('Alice Martin');
    expect(output).not.toContain('INSERT INTO');
    expect(output).not.toContain('oauth-code');
    expect(output).not.toContain('session=secret');
    const errors = errEntries(lines);
    expect(errors.some((err) => err.type === 'QueryFailedError')).toBe(true);
    for (const err of errors) {
      expect(typeof err.stack).toBe('string');
      expect(
        Object.keys(err).every((key) =>
          ['type', 'message', 'stack', 'code'].includes(key),
        ),
      ).toBe(true);
    }
  });
});
