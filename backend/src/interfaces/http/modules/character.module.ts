import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplyCharacterDeltaUseCase } from '../../../application/character/apply-character-delta.use-case';
import { CreateCharacterUseCase } from '../../../application/character/create-character.use-case';
import { GetCharacterUseCase } from '../../../application/character/get-character.use-case';
import { ListCharactersForSessionUseCase } from '../../../application/character/list-characters-for-session.use-case';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TypeOrmCharacterRepository } from '../../../infrastructure/persistence/repositories/typeorm-character.repository';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmSessionPlayerRepository } from '../../../infrastructure/persistence/repositories/typeorm-session-player.repository';
import { CharacterController } from '../controllers/character.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CharacterOrmEntity,
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
    ]),
  ],
  controllers: [CharacterController],
  providers: [
    { provide: CharacterRepository, useClass: TypeOrmCharacterRepository },
    // Needed by GetCharacterUseCase/ListCharactersForSessionUseCase's
    // visibility gating (charactersVisibleToOthers + active-player check).
    { provide: GameSessionRepository, useClass: TypeOrmGameSessionRepository },
    {
      provide: SessionPlayerRepository,
      useClass: TypeOrmSessionPlayerRepository,
    },
    CreateCharacterUseCase,
    GetCharacterUseCase,
    ListCharactersForSessionUseCase,
    ApplyCharacterDeltaUseCase,
  ],
})
export class CharacterModule {}
