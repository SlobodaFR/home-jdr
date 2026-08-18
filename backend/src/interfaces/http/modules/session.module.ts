import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateSessionUseCase } from '../../../application/session/create-session.use-case';
import { GetSessionStateUseCase } from '../../../application/session/get-session-state.use-case';
import { JoinSessionUseCase } from '../../../application/session/join-session.use-case';
import { ListSessionsForUserUseCase } from '../../../application/session/list-sessions-for-user.use-case';
import { SubmitTurnActionUseCase } from '../../../application/session/submit-turn-action.use-case';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { InviteCodeGeneratorPort } from '../../../domain/session/invite-code-generator.port';
import { SceneResolverPort } from '../../../domain/session/scene-resolver.port';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { TurnResolutionRepository } from '../../../domain/session/turn-resolution.repository';
import { TurnSubmissionRepository } from '../../../domain/session/turn-submission.repository';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TurnResolutionOrmEntity } from '../../../infrastructure/persistence/entities/turn-resolution.orm-entity';
import { TurnSubmissionOrmEntity } from '../../../infrastructure/persistence/entities/turn-submission.orm-entity';
import { TypeOrmCharacterRepository } from '../../../infrastructure/persistence/repositories/typeorm-character.repository';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { TypeOrmSessionPlayerRepository } from '../../../infrastructure/persistence/repositories/typeorm-session-player.repository';
import { TypeOrmTurnResolutionRepository } from '../../../infrastructure/persistence/repositories/typeorm-turn-resolution.repository';
import { TypeOrmTurnSubmissionRepository } from '../../../infrastructure/persistence/repositories/typeorm-turn-submission.repository';
import { ConcatenatingSceneResolver } from '../../../infrastructure/session/concatenating-scene-resolver.adapter';
import { RandomInviteCodeGenerator } from '../../../infrastructure/session/random-invite-code-generator';
import { SessionController } from '../controllers/session.controller';
import { UserProfileModule } from './user-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
      TurnSubmissionOrmEntity,
      TurnResolutionOrmEntity,
      CharacterOrmEntity,
      GameSystemOrmEntity,
    ]),
    UserProfileModule,
  ],
  controllers: [SessionController],
  providers: [
    { provide: GameSessionRepository, useClass: TypeOrmGameSessionRepository },
    {
      provide: SessionPlayerRepository,
      useClass: TypeOrmSessionPlayerRepository,
    },
    {
      provide: TurnSubmissionRepository,
      useClass: TypeOrmTurnSubmissionRepository,
    },
    {
      provide: TurnResolutionRepository,
      useClass: TypeOrmTurnResolutionRepository,
    },
    { provide: CharacterRepository, useClass: TypeOrmCharacterRepository },
    { provide: GameSystemRepository, useClass: TypeOrmGameSystemRepository },
    { provide: InviteCodeGeneratorPort, useClass: RandomInviteCodeGenerator },
    { provide: SceneResolverPort, useClass: ConcatenatingSceneResolver },
    CreateSessionUseCase,
    JoinSessionUseCase,
    SubmitTurnActionUseCase,
    GetSessionStateUseCase,
    ListSessionsForUserUseCase,
  ],
})
export class SessionModule {}
