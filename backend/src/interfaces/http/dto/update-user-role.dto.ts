import { IsIn } from 'class-validator';
import { UserRole } from '../../../domain/user/user-profile';

export class UpdateUserRoleDto {
  @IsIn(['admin', 'adult', 'child'])
  role!: UserRole;
}
