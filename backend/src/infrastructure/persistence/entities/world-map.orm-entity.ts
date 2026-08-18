import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'world_maps' })
export class WorldMapOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'text', name: 'image_storage_key' })
  imageStorageKey!: string;

  @Column({ type: 'text', name: 'generation_prompt' })
  generationPrompt!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
