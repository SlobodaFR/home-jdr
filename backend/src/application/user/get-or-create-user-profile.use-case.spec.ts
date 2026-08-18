import { UserProfile } from '../../domain/user/user-profile';
import { UserProfileRepository } from '../../domain/user/user-profile.repository';
import { GetOrCreateUserProfileUseCase } from './get-or-create-user-profile.use-case';

class InMemoryUserProfileRepository extends UserProfileRepository {
  constructor(private profiles: UserProfile[] = []) {
    super();
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.profiles.find((p) => p.userId === userId) ?? null;
  }

  async save(profile: UserProfile): Promise<void> {
    this.profiles = [
      ...this.profiles.filter((p) => p.userId !== profile.userId),
      profile,
    ];
  }
}

describe('GetOrCreateUserProfileUseCase', () => {
  it('creates a profile with the default role on first call', async () => {
    const repository = new InMemoryUserProfileRepository();
    const useCase = new GetOrCreateUserProfileUseCase(repository);

    const profile = await useCase.execute('user-1', 'admin');

    expect(profile.role).toBe('admin');
    await expect(repository.findByUserId('user-1')).resolves.not.toBeNull();
  });

  it('returns the existing profile without overwriting its role', async () => {
    const existing = UserProfile.create({ userId: 'user-1', role: 'child' });
    const repository = new InMemoryUserProfileRepository([existing]);
    const useCase = new GetOrCreateUserProfileUseCase(repository);

    const profile = await useCase.execute('user-1', 'admin');

    expect(profile.role).toBe('child');
  });
});
