import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'push_subscriptions' })
export class PushSubscriptionOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Column('text')
  endpoint!: string;

  @Column({ type: 'simple-json' })
  keys!: { p256dh: string; auth: string };

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
