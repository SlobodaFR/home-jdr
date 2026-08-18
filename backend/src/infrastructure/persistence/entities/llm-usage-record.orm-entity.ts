import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'llm_usage_records' })
export class LlmUsageRecordOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'integer', name: 'turn_number' })
  turnNumber!: number;

  @Column('text')
  provider!: string;

  @Column({ type: 'text', name: 'call_type' })
  callType!: string;

  @Column({ type: 'datetime', name: 'occurred_at' })
  occurredAt!: Date;
}
