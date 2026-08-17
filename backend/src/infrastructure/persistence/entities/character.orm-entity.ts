import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'characters' })
export class CharacterOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'game_system_id' })
  gameSystemId!: string;

  @Index()
  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'text', name: 'owner_user_id' })
  ownerUserId!: string;

  @Column('text')
  name!: string;

  @Column({ type: 'integer', name: 'hit_points_max' })
  hitPointsMax!: number;

  @Column({ type: 'integer', name: 'hit_points_current' })
  hitPointsCurrent!: number;

  @Column({ type: 'simple-json' })
  inventory!: { name: string; quantity: number }[];

  @Column({ type: 'simple-json', name: 'custom_attributes' })
  customAttributes!: Record<string, number | string>;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
