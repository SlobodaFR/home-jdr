import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_profiles' })
export class UserProfileOrmEntity {
  @PrimaryColumn({ type: 'text', name: 'user_id' })
  userId!: string;

  @Column('text')
  role!: string;
}
