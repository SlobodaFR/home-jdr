import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CharacterCreationDraft,
  CharacterCreationMessage,
  CharacterCreationStatus,
} from '../../../domain/character-creation/character-creation-session';

@Entity({ name: 'character_creation_sessions' })
@Index(['gameSessionId', 'userId'])
export class CharacterCreationSessionOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'game_session_id' })
  gameSessionId!: string;

  @Column({ type: 'text', name: 'game_system_id' })
  gameSystemId!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Column('text')
  status!: CharacterCreationStatus;

  @Column({ type: 'simple-json' })
  messages!: CharacterCreationMessage[];

  @Column({ type: 'simple-json', name: 'draft_character' })
  draftCharacter!: CharacterCreationDraft;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
