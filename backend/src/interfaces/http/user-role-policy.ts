import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../domain/user/user-profile';

/**
 * There is a single admin in practice (Thomas - see PRD.md/tasks/
 * 01-game-catalog.md). The very first time a user is seen, their
 * UserProfile role is bootstrapped to "admin" if their email is in the
 * comma-separated ADMIN_EMAILS env var, "adult" otherwise. Once a
 * UserProfile row exists it is authoritative - this function only decides
 * the *default* passed to GetOrCreateUserProfileUseCase.
 */
export function resolveDefaultRole(
  email: string,
  config: ConfigService,
): UserRole {
  const adminEmails = (config.get<string>('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.trim().toLowerCase()) ? 'admin' : 'adult';
}
