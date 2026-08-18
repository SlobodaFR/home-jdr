import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateGameSystemUseCase } from '../../../application/game-system/create-game-system.use-case';
import { DeleteGameSystemUseCase } from '../../../application/game-system/delete-game-system.use-case';
import { GetGameSystemUseCase } from '../../../application/game-system/get-game-system.use-case';
import { ListGameSystemsUseCase } from '../../../application/game-system/list-game-systems.use-case';
import { UpdateGameSystemUseCase } from '../../../application/game-system/update-game-system.use-case';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { PdfTextExtractorPort } from '../../../domain/game-system/pdf-text-extractor';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { PdfParseTextExtractor } from '../../../infrastructure/game-system/pdf-parse-text-extractor';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { GameSystemController } from '../controllers/game-system.controller';
import { UserProfileModule } from './user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSystemOrmEntity,
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
    ]),
    UserProfileModule,
  ],
  controllers: [GameSystemController],
  providers: [
    { provide: GameSystemRepository, useClass: TypeOrmGameSystemRepository },
    // Needed by DeleteGameSystemUseCase's "used by an existing session" guard.
    { provide: GameSessionRepository, useClass: TypeOrmGameSessionRepository },
    { provide: PdfTextExtractorPort, useClass: PdfParseTextExtractor },
    CreateGameSystemUseCase,
    UpdateGameSystemUseCase,
    DeleteGameSystemUseCase,
    ListGameSystemsUseCase,
    GetGameSystemUseCase,
  ],
})
export class GameSystemModule {}
