import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { CharacterStateDeltaProps } from '../../../domain/character/character-state-delta';

@Entity({ name: 'pending_character_deltas' })
@Index(['sessionId', 'turnNumber'])
export class PendingCharacterDeltaOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'integer', name: 'turn_number' })
  turnNumber!: number;

  @Index()
  @Column({ type: 'text', name: 'character_id' })
  characterId!: string;

  @Column({ type: 'simple-json', name: 'delta_payload' })
  deltaPayload!: CharacterStateDeltaProps;

  @Column('text')
  status!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
