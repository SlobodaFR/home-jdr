import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'game_sessions' })
export class GameSessionOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'game_system_id' })
  gameSystemId!: string;

  @Column('text')
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'invite_code' })
  inviteCode!: string;

  @Column('text')
  status!: string;

  @Column({ type: 'integer', name: 'current_turn_number' })
  currentTurnNumber!: number;

  @Column({ type: 'text', name: 'rolling_summary' })
  rollingSummary!: string;

  @Index()
  @Column({ type: 'text', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({
    type: 'boolean',
    name: 'characters_visible_to_others',
    default: false,
  })
  charactersVisibleToOthers!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @Column({
    type: 'text',
    name: 'opening_narration_text',
    nullable: true,
  })
  openingNarrationText!: string | null;
}
