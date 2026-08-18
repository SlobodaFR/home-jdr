import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { TurnResolutionDiceRoll } from '../../../domain/session/turn-resolution';

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

  @Column({ type: 'simple-json', name: 'dice_rolls', default: '[]' })
  diceRolls!: TurnResolutionDiceRoll[];

  @CreateDateColumn({ type: 'datetime', name: 'resolved_at' })
  resolvedAt!: Date;
}
