import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import { UserProfile } from '../../../domain/user/user-profile';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { resolveDefaultRole } from '../user-role-policy';

export interface RequestWithUserProfile extends AuthenticatedRequest {
  userProfile?: UserProfile;
}

/** Gates admin-only routes (catalog write endpoints, role assignment). */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private readonly getOrCreateUserProfile: GetOrCreateUserProfileUseCase,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUserProfile>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const profile = await this.getOrCreateUserProfile.execute(
      request.user.id,
      resolveDefaultRole(request.user.email, this.config),
    );

    if (profile.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    request.userProfile = profile;
    return true;
  }
}
