import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'app_settings' })
export class AppSettingOrmEntity {
  @PrimaryColumn('text')
  key!: string;

  @Column('text')
  value!: string;
}
