import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile, UserRole } from '../../../domain/user/user-profile';
import { UserProfileRepository } from '../../../domain/user/user-profile.repository';
import { UserProfileOrmEntity } from '../entities/user-profile.orm-entity';

@Injectable()
export class TypeOrmUserProfileRepository extends UserProfileRepository {
  constructor(
    @InjectRepository(UserProfileOrmEntity)
    private readonly repository: Repository<UserProfileOrmEntity>,
  ) {
    super();
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const row = await this.repository.findOne({ where: { userId } });
    return row
      ? UserProfile.create({ userId: row.userId, role: row.role as UserRole })
      : null;
  }

  async save(profile: UserProfile): Promise<void> {
    await this.repository.save({ userId: profile.userId, role: profile.role });
  }
}
