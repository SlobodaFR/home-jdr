import { UserProfile } from '../../domain/user/user-profile';
import { UserProfileRepository } from '../../domain/user/user-profile.repository';
import { UpdateUserRoleUseCase } from './update-user-role.use-case';

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

describe('UpdateUserRoleUseCase', () => {
  it('changes the role of an existing profile', async () => {
    const existing = UserProfile.create({ userId: 'user-1', role: 'adult' });
    const repository = new InMemoryUserProfileRepository([existing]);
    const useCase = new UpdateUserRoleUseCase(repository);

    const updated = await useCase.execute('user-1', 'child');

    expect(updated.role).toBe('child');
    await expect(repository.findByUserId('user-1')).resolves.toMatchObject({
      role: 'child',
    });
  });

  it('creates a profile with the given role when none exists yet', async () => {
    const repository = new InMemoryUserProfileRepository();
    const useCase = new UpdateUserRoleUseCase(repository);

    const updated = await useCase.execute('user-2', 'child');

    expect(updated.role).toBe('child');
  });
});
