import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import { UpdateUserRoleUseCase } from '../../../application/user/update-user-role.use-case';
import { UserProfile } from '../../../domain/user/user-profile';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { resolveDefaultRole } from '../user-role-policy';

interface UserProfileResponse {
  userId: string;
  role: UserProfile['role'];
}

function toResponse(profile: UserProfile): UserProfileResponse {
  return { userId: profile.userId, role: profile.role };
}

/**
 * Minimal role management surface for this task: the frontend uses `me` to
 * decide which catalog screens to show, and admins can promote/demote a
 * known userId via the `role` endpoint. No user-browsing UI ships in this
 * task (see 01-game-catalog.md deviations reported to the caller) - the
 * admin currently assigns roles from the target user's home-auth id.
 */
@Controller('user-profiles')
export class UserProfileController {
  constructor(
    private readonly getOrCreateUserProfile: GetOrCreateUserProfileUseCase,
    private readonly updateUserRole: UpdateUserRoleUseCase,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  async me(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserProfileResponse> {
    const profile = await this.getOrCreateUserProfile.execute(
      user.id,
      resolveDefaultRole(user.email, this.config),
    );
    return toResponse(profile);
  }

  @UseGuards(AdminRoleGuard)
  @Patch(':userId/role')
  async updateRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserProfileResponse> {
    const profile = await this.updateUserRole.execute(userId, dto.role);
    return toResponse(profile);
  }
}
