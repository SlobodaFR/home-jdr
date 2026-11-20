import { validateEnv } from './validate-env';

const PROD = {
  NODE_ENV: 'production',
  AUTH_SERVICE_URL: 'https://auth.sloboda.fr',
  AUTH_CLIENT_ID: 'jdr',
  AUTH_CLIENT_SECRET: 'client-secret',
  AUTH_WEBHOOK_SECRET: 'webhook-secret',
  FRONTEND_URL: 'https://jdr.sloboda.fr',
  MINIO_ENDPOINT: 'https://minio.sloboda.fr',
  MINIO_BUCKET: 'bucket',
  MINIO_ACCESS_KEY_ID: 'key',
  MINIO_SECRET_ACCESS_KEY: 'secret',
};

describe('validateEnv', () => {
  it('accepts anything outside production (local runs and tests need no setup)', () => {
    expect(validateEnv({})).toEqual({});
    expect(validateEnv({ NODE_ENV: 'test' })).toEqual({ NODE_ENV: 'test' });
  });

  it('accepts a complete production environment, optional variables unset', () => {
    expect(validateEnv(PROD)).toEqual(PROD);
  });

  it.each([
    'AUTH_SERVICE_URL',
    'AUTH_CLIENT_ID',
    'AUTH_CLIENT_SECRET',
    'AUTH_WEBHOOK_SECRET',
    'FRONTEND_URL',
    'MINIO_ENDPOINT',
    'MINIO_BUCKET',
    'MINIO_ACCESS_KEY_ID',
    'MINIO_SECRET_ACCESS_KEY',
  ])('refuses to start in production without %s', (variable) => {
    expect(() => validateEnv({ ...PROD, [variable]: undefined })).toThrow(
      variable,
    );
    expect(() => validateEnv({ ...PROD, [variable]: '  ' })).toThrow(variable);
  });

  it.each(['AUTH_SERVICE_URL', 'FRONTEND_URL', 'MINIO_ENDPOINT'])(
    'requires %s to be an https URL in production',
    (variable) => {
      expect(() =>
        validateEnv({ ...PROD, [variable]: 'http://example.test' }),
      ).toThrow('https://');
      expect(() => validateEnv({ ...PROD, [variable]: 'not a url' })).toThrow(
        variable,
      );
    },
  );
});
