import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddMapPinUseCase } from '../../../application/world-map/add-map-pin.use-case';
import { GenerateWorldMapUseCase } from '../../../application/world-map/generate-world-map.use-case';
import { GetWorldMapUseCase } from '../../../application/world-map/get-world-map.use-case';
import { RemoveMapPinUseCase } from '../../../application/world-map/remove-map-pin.use-case';
import { UpdateMapPinUseCase } from '../../../application/world-map/update-map-pin.use-case';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { ImageGenerationPort } from '../../../domain/world-map/image-generation.port';
import { MapPinRepository } from '../../../domain/world-map/map-pin.repository';
import { ObjectStoragePort } from '../../../domain/world-map/object-storage.port';
import { WorldMapRepository } from '../../../domain/world-map/world-map.repository';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { MapPinOrmEntity } from '../../../infrastructure/persistence/entities/map-pin.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { WorldMapOrmEntity } from '../../../infrastructure/persistence/entities/world-map.orm-entity';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { TypeOrmMapPinRepository } from '../../../infrastructure/persistence/repositories/typeorm-map-pin.repository';
import { TypeOrmSessionPlayerRepository } from '../../../infrastructure/persistence/repositories/typeorm-session-player.repository';
import { TypeOrmWorldMapRepository } from '../../../infrastructure/persistence/repositories/typeorm-world-map.repository';
import { MinioObjectStorageAdapter } from '../../../infrastructure/world-map/minio-object-storage.adapter';
import { OpenAiImageGenerationAdapter } from '../../../infrastructure/world-map/openai-image-generation.adapter';
import { WorldMapController } from '../controllers/world-map.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorldMapOrmEntity,
      MapPinOrmEntity,
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
      GameSystemOrmEntity,
    ]),
  ],
  controllers: [WorldMapController],
  providers: [
    { provide: WorldMapRepository, useClass: TypeOrmWorldMapRepository },
    { provide: MapPinRepository, useClass: TypeOrmMapPinRepository },
    { provide: GameSessionRepository, useClass: TypeOrmGameSessionRepository },
    {
      provide: SessionPlayerRepository,
      useClass: TypeOrmSessionPlayerRepository,
    },
    { provide: GameSystemRepository, useClass: TypeOrmGameSystemRepository },
    { provide: ImageGenerationPort, useClass: OpenAiImageGenerationAdapter },
    { provide: ObjectStoragePort, useClass: MinioObjectStorageAdapter },
    GenerateWorldMapUseCase,
    GetWorldMapUseCase,
    AddMapPinUseCase,
    UpdateMapPinUseCase,
    RemoveMapPinUseCase,
  ],
})
export class WorldMapModule {}
