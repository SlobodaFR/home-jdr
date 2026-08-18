import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'turn_resolutions' })
@Index(['sessionId', 'turnNumber'])
export class TurnResolutionOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'integer', name: 'turn_number' })
  turnNumber!: number;

  @Column({ type: 'text', name: 'narration_text' })
  narrationText!: string;

  @CreateDateColumn({ type: 'datetime', name: 'resolved_at' })
  resolvedAt!: Date;
}
