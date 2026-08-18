import { Injectable } from '@nestjs/common';
import { UserProfile, UserRole } from '../../domain/user/user-profile';
import { UserProfileRepository } from '../../domain/user/user-profile.repository';

/**
 * Bootstraps the local UserProfile mirror on first sight of a home-auth
 * user. `defaultRole` is decided by the HTTP layer (see
 * interfaces/http/user-role-policy.ts) from the ADMIN_EMAILS allowlist -
 * kept out of this use-case so it stays framework/config-agnostic.
 */
@Injectable()
export class GetOrCreateUserProfileUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(userId: string, defaultRole: UserRole): Promise<UserProfile> {
    const existing = await this.userProfileRepository.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const created = UserProfile.create({ userId, role: defaultRole });
    await this.userProfileRepository.save(created);
    return created;
  }
}
