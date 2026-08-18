import { UserProfile } from './user-profile';

describe('UserProfile', () => {
  it('creates a profile with the given role', () => {
    const profile = UserProfile.create({ userId: 'user-1', role: 'child' });

    expect(profile.userId).toBe('user-1');
    expect(profile.role).toBe('child');
  });

  it('rejects an unknown role', () => {
    expect(() =>
      UserProfile.create({ userId: 'user-1', role: 'superadmin' as never }),
    ).toThrow();
  });

  it('withRole() returns a new instance with the role changed', () => {
    const profile = UserProfile.create({ userId: 'user-1', role: 'adult' });

    const promoted = profile.withRole('admin');

    expect(promoted.userId).toBe('user-1');
    expect(promoted.role).toBe('admin');
    expect(profile.role).toBe('adult');
  });
});
