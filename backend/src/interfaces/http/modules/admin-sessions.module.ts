import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListSessionsForAdminUseCase } from '../../../application/session/list-sessions-for-admin.use-case';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TypeOrmCharacterRepository } from '../../../infrastructure/persistence/repositories/typeorm-character.repository';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { TypeOrmSessionPlayerRepository } from '../../../infrastructure/persistence/repositories/typeorm-session-player.repository';
import { AdminSessionsController } from '../controllers/admin-sessions.controller';
import { UserProfileModule } from './user-profile.module';

/**
 * Admin-only sessions overview (`GET /admin/sessions`, see
 * `ListSessionsForAdminUseCase`). Binds its own lightweight repository set
 * rather than importing `SessionModule` - that module also wires the LLM
 * adapters and `UsageQuotaModule`, unnecessary weight for a read-only admin
 * list (mirrors `CharacterModule`, which independently wires
 * `GameSessionRepository`/`SessionPlayerRepository` the same way).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
      GameSystemOrmEntity,
      CharacterOrmEntity,
    ]),
    UserProfileModule,
  ],
  controllers: [AdminSessionsController],
  providers: [
    { provide: GameSessionRepository, useClass: TypeOrmGameSessionRepository },
    {
      provide: SessionPlayerRepository,
      useClass: TypeOrmSessionPlayerRepository,
    },
    { provide: GameSystemRepository, useClass: TypeOrmGameSystemRepository },
    { provide: CharacterRepository, useClass: TypeOrmCharacterRepository },
    ListSessionsForAdminUseCase,
  ],
})
export class AdminSessionsModule {}
