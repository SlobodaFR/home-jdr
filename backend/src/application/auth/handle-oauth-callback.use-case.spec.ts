import {
  OAuthClient,
  TokenPair,
  UserProfile,
} from '../../domain/auth/oauth-client';
import { User } from '../../domain/user/user';
import { UserRepository } from '../../domain/user/user.repository';
import { HandleOAuthCallbackUseCase } from './handle-oauth-callback.use-case';

class FakeOAuthClient extends OAuthClient {
  constructor(
    private readonly tokens: TokenPair,
    private readonly profile: UserProfile,
  ) {
    super();
  }

  authorizeUrl(): string {
    throw new Error('not implemented');
  }

  async exchangeCode(): Promise<TokenPair> {
    return this.tokens;
  }

  async refresh(): Promise<TokenPair> {
    throw new Error('not implemented');
  }

  async fetchUserInfo(): Promise<UserProfile> {
    return this.profile;
  }
}

class InMemoryUserRepository extends UserRepository {
  constructor(private users: User[] = []) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users = [...this.users.filter((u) => u.id !== user.id), user];
  }
}

describe('HandleOAuthCallbackUseCase', () => {
  const tokens: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
  };
  const profile: UserProfile = {
    id: 'user-1',
    email: 'player@example.com',
    name: 'Player One',
    avatarUrl: 'https://example.com/avatar.png',
  };

  it('creates a new local user on first login', async () => {
    const userRepository = new InMemoryUserRepository();
    const useCase = new HandleOAuthCallbackUseCase(
      new FakeOAuthClient(tokens, profile),
      userRepository,
    );

    const result = await useCase.execute(
      'auth-code',
      'https://jdr.sloboda.fr/api/auth/callback',
    );

    expect(result.tokens).toEqual(tokens);
    expect(result.user.id).toBe('user-1');
    await expect(userRepository.findById('user-1')).resolves.not.toBeNull();
  });

  it('refreshes the profile of an existing local user', async () => {
    const existing = User.create({
      id: 'user-1',
      email: 'old@example.com',
      name: 'Old Name',
      avatarUrl: 'https://example.com/old.png',
      createdAt: new Date('2025-01-01'),
    });
    const userRepository = new InMemoryUserRepository([existing]);
    const useCase = new HandleOAuthCallbackUseCase(
      new FakeOAuthClient(tokens, profile),
      userRepository,
    );

    const result = await useCase.execute(
      'auth-code',
      'https://jdr.sloboda.fr/api/auth/callback',
    );

    expect(result.user.email).toBe('player@example.com');
    expect(result.user.name).toBe('Player One');
  });
});
