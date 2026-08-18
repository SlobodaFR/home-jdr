import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../../domain/usage-quota/app-setting';
import { AppSettingRepository } from '../../../domain/usage-quota/app-setting.repository';
import { AppSettingOrmEntity } from '../entities/app-setting.orm-entity';

@Injectable()
export class TypeOrmAppSettingRepository extends AppSettingRepository {
  constructor(
    @InjectRepository(AppSettingOrmEntity)
    private readonly repository: Repository<AppSettingOrmEntity>,
  ) {
    super();
  }

  async findByKey(key: string): Promise<AppSetting | null> {
    const row = await this.repository.findOne({ where: { key } });
    return row ? AppSetting.create({ key: row.key, value: row.value }) : null;
  }

  async save(setting: AppSetting): Promise<void> {
    await this.repository.save({ key: setting.key, value: setting.value });
  }
}
