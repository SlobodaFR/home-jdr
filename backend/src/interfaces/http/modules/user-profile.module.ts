import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import { UpdateUserRoleUseCase } from '../../../application/user/update-user-role.use-case';
import { UserProfileRepository } from '../../../domain/user/user-profile.repository';
import { UserProfileOrmEntity } from '../../../infrastructure/persistence/entities/user-profile.orm-entity';
import { TypeOrmUserProfileRepository } from '../../../infrastructure/persistence/repositories/typeorm-user-profile.repository';
import { UserProfileController } from '../controllers/user-profile.controller';
import { AdminRoleGuard } from '../guards/admin-role.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfileOrmEntity])],
  controllers: [UserProfileController],
  providers: [
    { provide: UserProfileRepository, useClass: TypeOrmUserProfileRepository },
    GetOrCreateUserProfileUseCase,
    UpdateUserRoleUseCase,
    AdminRoleGuard,
  ],
  exports: [GetOrCreateUserProfileUseCase, AdminRoleGuard],
})
export class UserProfileModule {}
