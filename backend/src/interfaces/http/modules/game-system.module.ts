import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateGameSystemUseCase } from '../../../application/game-system/create-game-system.use-case';
import { GetGameSystemUseCase } from '../../../application/game-system/get-game-system.use-case';
import { ListGameSystemsUseCase } from '../../../application/game-system/list-game-systems.use-case';
import { UpdateGameSystemUseCase } from '../../../application/game-system/update-game-system.use-case';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { PdfTextExtractorPort } from '../../../domain/game-system/pdf-text-extractor';
import { PdfParseTextExtractor } from '../../../infrastructure/game-system/pdf-parse-text-extractor';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { GameSystemController } from '../controllers/game-system.controller';
import { UserProfileModule } from './user-profile.module';

@Module({
  imports: [TypeOrmModule.forFeature([GameSystemOrmEntity]), UserProfileModule],
  controllers: [GameSystemController],
  providers: [
    { provide: GameSystemRepository, useClass: TypeOrmGameSystemRepository },
    { provide: PdfTextExtractorPort, useClass: PdfParseTextExtractor },
    CreateGameSystemUseCase,
    UpdateGameSystemUseCase,
    ListGameSystemsUseCase,
    GetGameSystemUseCase,
  ],
})
export class GameSystemModule {}
