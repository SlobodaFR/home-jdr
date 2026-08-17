import { User } from './user';

describe('User', () => {
  const baseProps = {
    id: 'user-1',
    email: 'Player@Example.com',
    name: 'Player One',
    avatarUrl: 'https://example.com/avatar.png',
    createdAt: new Date('2026-01-01'),
  };

  it('normalizes the email to lowercase, trimmed', () => {
    const user = User.create({ ...baseProps, email: '  Player@Example.com  ' });
    expect(user.email).toBe('player@example.com');
  });

  it('rejects an invalid email address', () => {
    expect(() =>
      User.create({ ...baseProps, email: 'not-an-email' }),
    ).toThrow();
  });

  it('returns a copy with the refreshed profile fields', () => {
    const user = User.create(baseProps);
    const updated = user.withProfile({
      email: 'new@example.com',
      name: 'New Name',
      avatarUrl: 'https://example.com/new.png',
    });

    expect(updated.id).toBe(user.id);
    expect(updated.email).toBe('new@example.com');
    expect(updated.name).toBe('New Name');
    expect(user.email).toBe('player@example.com');
  });
});
