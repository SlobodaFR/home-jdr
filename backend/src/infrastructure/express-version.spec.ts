import { createRequire } from 'module';

const require = createRequire(__filename);

// `express` is a direct dependency because @nestjs/serve-static declares `express ^5.0.1` as a
// peer dependency that the consumer must satisfy. It is pinned to exactly what
// @nestjs/platform-express pins, so one copy resolves. This fails when they drift (no root
// `overrides` is used): bump both together.
describe('express version', () => {
  it('matches the version pinned by @nestjs/platform-express', () => {
    const own = (require('express/package.json') as { version: string })
      .version;
    const pinned = (
      require('@nestjs/platform-express/package.json') as {
        dependencies: { express: string };
      }
    ).dependencies.express;

    expect(own).toBe(pinned);
  });
});
