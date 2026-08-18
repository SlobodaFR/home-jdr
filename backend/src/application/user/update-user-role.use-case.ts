import { Injectable } from '@nestjs/common';
import { UserProfile, UserRole } from '../../domain/user/user-profile';
import { UserProfileRepository } from '../../domain/user/user-profile.repository';

/** Admin-only role assignment (see interfaces/http/guards/admin-role.guard.ts). */
@Injectable()
export class UpdateUserRoleUseCase {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async execute(userId: string, role: UserRole): Promise<UserProfile> {
    const existing = await this.userProfileRepository.findByUserId(userId);
    const updated = existing
      ? existing.withRole(role)
      : UserProfile.create({ userId, role });
    await this.userProfileRepository.save(updated);
    return updated;
  }
}
