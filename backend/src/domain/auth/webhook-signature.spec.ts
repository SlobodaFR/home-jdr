import { FixedClock } from '../../application/shared/fixed-clock';
import {
  computeWebhookSignature,
  WebhookSignatureVerifier,
} from './webhook-signature';

/**
 * FIXED test vectors of contract PC7, copied from home-auth
 * (backend/src/domain/shared/webhook-signer.spec.ts, PR #83). Cross-checked with
 * `printf '%s' '<id>.<timestamp>.<body>' | openssl dgst -sha256 -hmac <secret>`: the key is the
 * secret string itself (its 64 hex characters, UTF-8), NOT its decoded bytes.
 */
const SECRET_1 =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const SECRET_2 =
  'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100';
const ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const BODY = '{"userId":"u1"}';
const VECTOR_1 =
  '41294c53497c1d18871786b2d5c3ec091e6b357638e7104d826de50af8813242';
const VECTOR_2 =
  '89de6c4652b33d864427b3091771ed8b9266a99b3bf915b126eb4655a2dce09f';

describe('computeWebhookSignature (PC7 vectors)', () => {
  it('vector 1: HMAC-SHA256(secret, id.timestamp.rawBody)', () => {
    expect(computeWebhookSignature(SECRET_1, ID, '1700000000', BODY)).toBe(
      VECTOR_1,
    );
  });

  it('vector 2: another secret, same message', () => {
    expect(computeWebhookSignature(SECRET_2, ID, '1700000000', BODY)).toBe(
      VECTOR_2,
    );
  });

  it('vector 3: body hashed as UTF-8 bytes (non-ASCII user id)', () => {
    expect(
      computeWebhookSignature(
        SECRET_1,
        '9b2f0f6e-8d3a-4f6b-9c1e-2a7d5e4c1b30',
        '1700000123',
        '{"userId":"4b8f-é"}',
      ),
    ).toBe('d9a2c8cec34058ebb100f8b454ba46b1214cf777000d9aab00dda91205d5a3ac');
  });

  it('accepts the raw body as bytes (same signature as the UTF-8 string)', () => {
    expect(
      computeWebhookSignature(
        SECRET_1,
        '9b2f0f6e-8d3a-4f6b-9c1e-2a7d5e4c1b30',
        '1700000123',
        Buffer.from('{"userId":"4b8f-é"}', 'utf8'),
      ),
    ).toBe('d9a2c8cec34058ebb100f8b454ba46b1214cf777000d9aab00dda91205d5a3ac');
  });
});

const clockAt = (iso: string) => new FixedClock(new Date(iso));

describe('WebhookSignatureVerifier', () => {
  const NOW = '2023-11-14T22:13:20.000Z'; // 1700000000
  let clock: FixedClock;
  let verifier: WebhookSignatureVerifier;

  beforeEach(() => {
    clock = clockAt(NOW);
    verifier = new WebhookSignatureVerifier(SECRET_1, clock);
  });

  const check = (
    headers: { id?: string; timestamp?: string; signature?: string },
    rawBody: string | Buffer = BODY,
  ) => verifier.verify(headers, rawBody);
  const valid = (overrides: { id?: string; timestamp?: string } = {}) => ({
    id: ID,
    timestamp: '1700000000',
    signature: `v1=${VECTOR_1}`,
    ...overrides,
  });

  it('accepts a valid signature (vector 1)', () => {
    expect(check(valid())).toBe('ok');
  });

  it('accepts the raw body as bytes', () => {
    expect(check(valid(), Buffer.from(BODY))).toBe('ok');
  });

  it('accepts several v1= entries if one matches, wherever it sits (overlap)', () => {
    expect(
      check({ ...valid(), signature: `v1=${VECTOR_2},v1=${VECTOR_1}` }),
    ).toBe('ok');
    clock.set(new Date(NOW));
    const other = new WebhookSignatureVerifier(SECRET_1, clock);
    expect(
      other.verify(
        {
          ...valid({ id: 'other-id' }),
          signature: `v1=${computeWebhookSignature(SECRET_1, 'other-id', '1700000000', BODY)},v1=${VECTOR_2}`,
        },
        BODY,
      ),
    ).toBe('ok');
  });

  it('tolerates spaces around commas', () => {
    expect(
      check({ ...valid(), signature: `v1=${VECTOR_2}, v1=${VECTOR_1}` }),
    ).toBe('ok');
  });

  it('refuses a signature that does not match (wrong secret, body, id or timestamp)', () => {
    expect(check({ ...valid(), signature: `v1=${VECTOR_2}` })).toBe('hmac');
    expect(check(valid(), '{"userId":"u2"}')).toBe('hmac');
    expect(check(valid({ id: 'other-id' }))).toBe('hmac');
    expect(check(valid({ timestamp: '1700000001' }))).toBe('hmac');
  });

  it('signs the bytes received, not their re-serialization', () => {
    const spaced = '{ "userId": "u1" }';
    const signature = `v1=${computeWebhookSignature(SECRET_1, ID, '1700000000', spaced)}`;
    expect(check({ ...valid(), signature }, spaced)).toBe('ok');
    expect(check({ ...valid(), id: 'other-id', signature }, BODY)).toBe('hmac');
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['no version', VECTOR_1],
    ['unknown version', `v2=${VECTOR_1}`],
    ['hex too short', `v1=${VECTOR_1.slice(2)}`],
    ['hex too long', `v1=${VECTOR_1}00`],
    ['non-hex characters', `v1=${'zz' + VECTOR_1.slice(2)}`],
    ['one valid and one malformed entry', `v1=${VECTOR_1},v1=abc`],
    ['empty entry', `v1=${VECTOR_1},`],
  ])('refuses a malformed signature header: %s', (_label, signature) => {
    expect(check({ ...valid(), signature })).toBe('format');
  });

  it.each([
    ['missing id', { id: undefined }],
    ['empty id', { id: '' }],
    ['missing timestamp', { timestamp: undefined }],
    ['non-numeric timestamp', { timestamp: 'yesterday' }],
    ['decimal timestamp', { timestamp: '1700000000.5' }],
    ['signed timestamp', { timestamp: '+1700000000' }],
  ])('refuses incomplete or invalid headers: %s', (_label, override) => {
    expect(check({ ...valid(), ...override })).toBe('format');
  });

  describe('±120 s window', () => {
    const signedAt = (timestamp: string) => ({
      id: ID,
      timestamp,
      signature: `v1=${computeWebhookSignature(SECRET_1, ID, timestamp, BODY)}`,
    });

    it('accepts exactly 120 s of drift, past or future', () => {
      expect(check(signedAt('1699999880'))).toBe('ok');
      const future = new WebhookSignatureVerifier(SECRET_1, clock);
      expect(future.verify(signedAt('1700000120'), BODY)).toBe('ok');
    });

    it('counts whole seconds, like the sender (exactly 120 s despite the milliseconds)', () => {
      clock.set(new Date('2023-11-14T22:13:20.900Z'));
      expect(check(signedAt('1699999880'))).toBe('ok');
    });

    it('refuses 121 s of drift, past or future', () => {
      expect(check(signedAt('1699999879'))).toBe('window');
      expect(check(signedAt('1700000121'))).toBe('window');
    });
  });

  describe('replay', () => {
    const laterAt = (timestamp: string) => ({
      id: ID,
      timestamp,
      signature: `v1=${computeWebhookSignature(SECRET_1, ID, timestamp, BODY)}`,
    });

    it('reports an id already seen in the last 10 minutes as a replay', () => {
      expect(check(valid())).toBe('ok');
      expect(check(valid())).toBe('replay');
      clock.set(new Date('2023-11-14T22:23:19.000Z')); // +9 min 59 s
      expect(check(laterAt('1700000599'))).toBe('replay');
    });

    it('reports a replay before looking at the signature, the window or the format of the rest', () => {
      expect(check(valid())).toBe('ok');
      expect(check({ ...valid(), signature: `v1=${VECTOR_2}` })).toBe('replay');
      expect(check(valid({ timestamp: '1600000000' }))).toBe('replay');
    });

    it('reports a replay even when the other headers are missing or malformed', () => {
      expect(check(valid())).toBe('ok');
      expect(check({ id: ID })).toBe('replay');
      expect(check({ id: ID, timestamp: 'yesterday', signature: 'abc' })).toBe(
        'replay',
      );
    });

    it('forgets the id after 10 minutes', () => {
      expect(check(valid())).toBe('ok');
      clock.set(new Date('2023-11-14T22:23:21.000Z')); // +10 min 1 s
      expect(check(laterAt('1700000601'))).toBe('ok');
    });

    it('does not remember the id of an invalid signature', () => {
      expect(check({ ...valid(), signature: `v1=${VECTOR_2}` })).toBe('hmac');
      expect(check(valid())).toBe('ok');
    });

    it('does not remember the id of an out-of-window request', () => {
      clock.set(new Date('2023-11-14T22:20:00.000Z')); // 400 s later: 1700000000 is stale
      expect(check(valid())).toBe('window');
      clock.set(new Date(NOW));
      expect(check(valid())).toBe('ok');
    });
  });
});
