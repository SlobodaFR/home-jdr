import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'session_players' })
export class SessionPlayerOrmEntity {
  @PrimaryColumn({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @PrimaryColumn({ type: 'text', name: 'user_id' })
  userId!: string;

  @Index()
  @Column({ type: 'text', name: 'character_id' })
  characterId!: string;

  @CreateDateColumn({ type: 'datetime', name: 'joined_at' })
  joinedAt!: Date;
}
