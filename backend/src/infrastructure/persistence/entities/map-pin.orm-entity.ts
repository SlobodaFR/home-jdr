import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'map_pins' })
export class MapPinOrmEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'world_map_id' })
  worldMapId!: string;

  @Column('text')
  label!: string;

  @Column({ type: 'real', name: 'position_x' })
  positionX!: number;

  @Column({ type: 'real', name: 'position_y' })
  positionY!: number;

  @Column('text')
  notes!: string;

  @Column({ type: 'text', name: 'created_by_user_id' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
