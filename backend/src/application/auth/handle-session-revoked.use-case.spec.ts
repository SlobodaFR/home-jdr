import { RevokedSessionRepository } from '../../domain/auth/revoked-session.repository';
import { HandleSessionRevokedUseCase } from './handle-session-revoked.use-case';

class InMemoryRevokedSessionRepository extends RevokedSessionRepository {
  private revoked = new Map<string, Date>();

  async markRevoked(userId: string, revokedAt: Date): Promise<void> {
    this.revoked.set(userId, revokedAt);
  }

  async getRevokedAt(userId: string): Promise<Date | null> {
    return this.revoked.get(userId) ?? null;
  }
}

describe('HandleSessionRevokedUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records the current time as the revocation timestamp for the user', async () => {
    const repository = new InMemoryRevokedSessionRepository();
    const useCase = new HandleSessionRevokedUseCase(repository);

    await useCase.execute('user-1');

    await expect(repository.getRevokedAt('user-1')).resolves.toEqual(
      new Date('2026-06-01T00:00:00Z'),
    );
  });
});
