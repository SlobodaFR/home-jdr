import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { CharacterSheetSchema } from '../../../domain/game-system/character-sheet-schema';
import { MechanicalAction } from '../../../domain/game-system/mechanical-action';

@Entity({ name: 'game_systems' })
export class GameSystemOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  description!: string;

  @Column({ type: 'boolean', name: 'adapted_for_children' })
  adaptedForChildren!: boolean;

  @Column({ type: 'text', name: 'rules_text' })
  rulesText!: string;

  @Column({ type: 'text', name: 'rules_source_file_name' })
  rulesSourceFileName!: string;

  @Column({ type: 'simple-json', name: 'character_sheet_schema' })
  characterSheetSchema!: CharacterSheetSchema;

  @Column({ type: 'simple-json', name: 'mechanical_actions' })
  mechanicalActions!: MechanicalAction[];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
