import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'turn_submissions' })
@Index(['sessionId', 'turnNumber'])
export class TurnSubmissionOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'integer', name: 'turn_number' })
  turnNumber!: number;

  @Column({ type: 'text', name: 'player_id' })
  playerId!: string;

  @Column({ type: 'text', name: 'action_text' })
  actionText!: string;

  @Column({ type: 'text', name: 'mechanical_action_key', nullable: true })
  mechanicalActionKey!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'submitted_at' })
  submittedAt!: Date;
}
