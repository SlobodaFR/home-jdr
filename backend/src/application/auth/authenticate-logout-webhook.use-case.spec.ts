import {
  computeWebhookSignature,
  WebhookSignatureVerifier,
} from '../../domain/auth/webhook-signature';
import { FeatureFlags } from '../../domain/shared/feature-flags';
import { FixedClock } from '../shared/fixed-clock';
import {
  AuthenticateLogoutWebhookUseCase,
  LogoutWebhookRequest,
  REQUIRE_SIGNATURE_FLAG,
} from './authenticate-logout-webhook.use-case';

const SIGNING_SECRET =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const LEGACY_SECRET = 'legacy-query-secret';
const BODY = '{"userId":"u1"}';
const ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const NOW = '2023-11-14T22:13:20.000Z'; // 1700000000

class FakeFlags extends FeatureFlags {
  enabled = false;
  readonly asked: [string, boolean][] = [];
  async isEnabled(key: string, codeDefault: boolean): Promise<boolean> {
    this.asked.push([key, codeDefault]);
    return key === REQUIRE_SIGNATURE_FLAG ? this.enabled : codeDefault;
  }
}

describe('AuthenticateLogoutWebhookUseCase', () => {
  let flags: FakeFlags;
  let clock: FixedClock;
  let logger: { log: string[]; warn: string[] };

  beforeEach(() => {
    logger = { log: [], warn: [] };
    flags = new FakeFlags();
    clock = new FixedClock(new Date(NOW));
  });

  function useCase(
    options: { signingSecret?: string | null; legacySecret?: string } = {},
  ) {
    const signingSecret =
      options.signingSecret === undefined
        ? SIGNING_SECRET
        : options.signingSecret;
    return new AuthenticateLogoutWebhookUseCase(
      signingSecret ? new WebhookSignatureVerifier(signingSecret, clock) : null,
      options.legacySecret ?? LEGACY_SECRET,
      flags,
      clock,
      {
        log: (m: string) => logger.log.push(m),
        warn: (m: string) => logger.warn.push(m),
      },
    );
  }

  function signed(id = ID, secret = SIGNING_SECRET, body = BODY) {
    return {
      headers: {
        id,
        timestamp: '1700000000',
        signature: `v1=${computeWebhookSignature(secret, id, '1700000000', body)}`,
      },
      rawBody: Buffer.from(body),
    };
  }
  const unsigned = { headers: {}, rawBody: Buffer.from(BODY) };

  describe(`${REQUIRE_SIGNATURE_FLAG} off (double acceptance)`, () => {
    it('accepts a valid signature, without ?secret=', async () => {
      expect(await useCase().execute({ ...signed() })).toBe(true);
    });

    it('accepts the legacy ?secret= without a signature', async () => {
      expect(
        await useCase().execute({ ...unsigned, querySecret: LEGACY_SECRET }),
      ).toBe(true);
    });

    it('accepts a valid signature even if ?secret= is wrong', async () => {
      expect(
        await useCase().execute({ ...signed(), querySecret: 'faux' }),
      ).toBe(true);
    });

    it('accepts the legacy ?secret= even if the signature is wrong', async () => {
      const forged = signed(ID, 'f'.repeat(64));
      expect(
        await useCase().execute({ ...forged, querySecret: LEGACY_SECRET }),
      ).toBe(true);
    });

    it('refuses without a valid signature or a correct ?secret=', async () => {
      const uc = useCase();
      expect(await uc.execute({ ...unsigned })).toBe(false);
      expect(await uc.execute({ ...unsigned, querySecret: 'faux' })).toBe(
        false,
      );
      expect(await uc.execute({ ...unsigned, querySecret: '' })).toBe(false);
      expect(
        await uc.execute({
          ...signed(ID, 'f'.repeat(64)),
          querySecret: 'faux',
        }),
      ).toBe(false);
    });

    it('compares ?secret= in full (prefix, suffix, case)', async () => {
      const uc = useCase();
      for (const guess of [
        LEGACY_SECRET.slice(0, -1),
        `${LEGACY_SECRET}x`,
        LEGACY_SECRET.toUpperCase(),
      ])
        expect(await uc.execute({ ...unsigned, querySecret: guess })).toBe(
          false,
        );
    });

    it('refuses the replay of a signed id, even with a valid ?secret=', async () => {
      const uc = useCase();
      expect(await uc.execute({ ...signed() })).toBe(true);
      expect(await uc.execute({ ...signed() })).toBe(false);
      expect(
        await uc.execute({ ...signed(), querySecret: LEGACY_SECRET }),
      ).toBe(false);
      expect(logger.warn).toEqual([]);
    });

    it('refuses a replayed id sent alone (no timestamp or signature), even with a valid ?secret=', async () => {
      const uc = useCase();
      expect(await uc.execute({ ...signed() })).toBe(true);
      expect(
        await uc.execute({
          headers: { id: ID },
          rawBody: Buffer.from(BODY),
          querySecret: LEGACY_SECRET,
        }),
      ).toBe(false);
    });

    it('without a configured signing secret, only the legacy path exists', async () => {
      const uc = useCase({ signingSecret: null });
      expect(await uc.execute({ ...signed() })).toBe(false);
      expect(
        await uc.execute({ ...signed(), querySecret: LEGACY_SECRET }),
      ).toBe(true);
    });

    it('a missing or empty legacy secret lets nobody through', async () => {
      for (const legacySecret of ['', undefined as unknown as string]) {
        const uc = useCase({ legacySecret });
        expect(await uc.execute({ ...unsigned, querySecret: '' })).toBe(false);
        expect(await uc.execute({ ...unsigned })).toBe(false);
      }
    });

    it('reads the flag with false as the code default, and only if the signature does not suffice', async () => {
      const uc = useCase();
      await uc.execute({ ...signed() });
      expect(flags.asked).toEqual([]);
      await uc.execute({ ...unsigned, querySecret: LEGACY_SECRET });
      expect(flags.asked).toEqual([[REQUIRE_SIGNATURE_FLAG, false]]);
    });
  });

  describe(`${REQUIRE_SIGNATURE_FLAG} on (signature mandatory)`, () => {
    beforeEach(() => {
      flags.enabled = true;
    });

    it('accepts a valid signature', async () => {
      expect(await useCase().execute({ ...signed() })).toBe(true);
    });

    it('refuses the legacy ?secret= alone', async () => {
      expect(
        await useCase().execute({ ...unsigned, querySecret: LEGACY_SECRET }),
      ).toBe(false);
    });

    it('refuses a wrong signature even with the right ?secret=', async () => {
      expect(
        await useCase().execute({
          ...signed(ID, 'f'.repeat(64)),
          querySecret: LEGACY_SECRET,
        }),
      ).toBe(false);
    });

    it('refuses a replay, even with the right ?secret=', async () => {
      const uc = useCase();
      expect(await uc.execute({ ...signed() })).toBe(true);
      expect(
        await uc.execute({ ...signed(), querySecret: LEGACY_SECRET }),
      ).toBe(false);
    });

    it('without a configured signing secret, everything is refused (fail closed)', async () => {
      const uc = useCase({ signingSecret: null });
      expect(await uc.execute({ ...signed() })).toBe(false);
      expect(
        await uc.execute({ ...unsigned, querySecret: LEGACY_SECRET }),
      ).toBe(false);
    });
  });

  describe('acceptance logging', () => {
    const all = () => [...logger.log, ...logger.warn].join('\n');
    const withSecret = (r: LogoutWebhookRequest): LogoutWebhookRequest => ({
      ...r,
      querySecret: LEGACY_SECRET,
    });

    const situations: [string, () => Promise<boolean>][] = [
      ['no-signature-headers', () => useCase().execute(withSecret(unsigned))],
      [
        'missing-signing-secret',
        () => useCase({ signingSecret: null }).execute(withSecret(signed())),
      ],
      [
        'format',
        () =>
          useCase().execute(
            withSecret({
              ...signed(),
              headers: { ...signed().headers, signature: 'abc' },
            }),
          ),
      ],
      [
        'window',
        () =>
          useCase().execute(
            withSecret({
              headers: {
                id: ID,
                timestamp: '1699990000',
                signature: `v1=${computeWebhookSignature(SIGNING_SECRET, ID, '1699990000', BODY)}`,
              },
              rawBody: Buffer.from(BODY),
            }),
          ),
      ],
      ['hmac', () => useCase().execute(withSecret(signed(ID, 'f'.repeat(64))))],
      [
        'raw-body-unavailable',
        () => useCase().execute(withSecret({ headers: signed().headers })),
      ],
    ];

    it.each(situations)(
      'WARN with reason %s when ?secret= saves the request',
      async (reason, run) => {
        expect(await run()).toBe(true);
        expect(logger.warn).toHaveLength(1);
        expect(logger.warn[0]).toContain(reason);
        expect(logger.log).toEqual([]);
      },
    );

    it('INFO when the signature is accepted', async () => {
      expect(await useCase().execute(signed())).toBe(true);
      expect(logger.log).toHaveLength(1);
      expect(logger.log[0]).toContain('signature');
      expect(logger.warn).toEqual([]);
    });

    it('one line per reason every 5 minutes (INFO has its own key)', async () => {
      const uc = useCase();
      await uc.execute(withSecret(unsigned));
      await uc.execute(withSecret(unsigned));
      expect(logger.warn).toHaveLength(1);

      await uc.execute(withSecret(signed(ID, 'f'.repeat(64)))); // other reason
      expect(logger.warn).toHaveLength(2);

      await uc.execute(signed('a1'));
      await uc.execute(signed('a2'));
      expect(logger.log).toHaveLength(1);

      clock.set(new Date('2023-11-14T22:18:19.000Z')); // +4 min 59 s
      await uc.execute(withSecret(unsigned));
      expect(logger.warn).toHaveLength(2);

      clock.set(new Date('2023-11-14T22:18:20.000Z')); // +5 min
      await uc.execute(withSecret(unsigned));
      expect(logger.warn).toHaveLength(3);
    });

    it('never logs the secret, the signature or the id', async () => {
      const uc = useCase();
      const forged = signed('id-secret-xyz', 'f'.repeat(64));
      await uc.execute(withSecret(forged));
      await uc.execute(signed('id-valide-abc'));
      for (const [, run] of situations) await run();
      const out = all();
      expect(logger.warn.length).toBeGreaterThan(0);
      expect(out).not.toContain(LEGACY_SECRET);
      expect(out).not.toContain(SIGNING_SECRET);
      expect(out).not.toContain('id-secret-xyz');
      expect(out).not.toContain('id-valide-abc');
      expect(out).not.toContain(ID);
      expect(out).not.toContain(forged.headers.signature);
      expect(out).not.toContain(signed().headers.signature);
    });
  });
});
