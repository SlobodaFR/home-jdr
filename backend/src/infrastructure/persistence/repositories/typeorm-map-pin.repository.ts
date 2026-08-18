import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapPin } from '../../../domain/world-map/map-pin';
import { MapPinRepository } from '../../../domain/world-map/map-pin.repository';
import { MapPinOrmEntity } from '../entities/map-pin.orm-entity';

@Injectable()
export class TypeOrmMapPinRepository extends MapPinRepository {
  constructor(
    @InjectRepository(MapPinOrmEntity)
    private readonly repository: Repository<MapPinOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<MapPin | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByWorldMapId(worldMapId: string): Promise<MapPin[]> {
    const rows = await this.repository.find({ where: { worldMapId } });
    return rows.map(toDomain);
  }

  async save(pin: MapPin): Promise<void> {
    await this.repository.save({
      id: pin.id,
      worldMapId: pin.worldMapId,
      label: pin.label,
      positionX: pin.positionX,
      positionY: pin.positionY,
      notes: pin.notes,
      createdByUserId: pin.createdByUserId,
      createdAt: pin.createdAt,
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async deleteByWorldMapId(worldMapId: string): Promise<void> {
    await this.repository.delete({ worldMapId });
  }
}

function toDomain(row: MapPinOrmEntity): MapPin {
  return MapPin.create({
    id: row.id,
    worldMapId: row.worldMapId,
    label: row.label,
    positionX: row.positionX,
    positionY: row.positionY,
    notes: row.notes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  });
}
