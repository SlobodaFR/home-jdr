import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplyCharacterDeltaUseCase } from '../../../application/character/apply-character-delta.use-case';
import { RejectCharacterDeltaUseCase } from '../../../application/character/reject-character-delta.use-case';
import { ValidateCharacterDeltaUseCase } from '../../../application/character/validate-character-delta.use-case';
import { CreateSessionUseCase } from '../../../application/session/create-session.use-case';
import { DeleteSessionCascade } from '../../../application/session/delete-session-cascade';
import { DeleteSoloSessionUseCase } from '../../../application/session/delete-solo-session.use-case';
import { GetSessionStateUseCase } from '../../../application/session/get-session-state.use-case';
import { JoinSessionUseCase } from '../../../application/session/join-session.use-case';
import { LeaveSessionUseCase } from '../../../application/session/leave-session.use-case';
import { ListSessionsForUserUseCase } from '../../../application/session/list-sessions-for-user.use-case';
import { MaintainRollingSummaryUseCase } from '../../../application/session/maintain-rolling-summary.use-case';
import { ResolveSceneUseCase } from '../../../application/session/resolve-scene.use-case';
import { SubmitTurnActionUseCase } from '../../../application/session/submit-turn-action.use-case';
import { CharacterCreationSessionRepository } from '../../../domain/character-creation/character-creation-session.repository';
import { CharacterRepository } from '../../../domain/character/character.repository';
import { PendingCharacterDeltaRepository } from '../../../domain/character/pending-character-delta.repository';
import { GameSystemRepository } from '../../../domain/game-system/game-system.repository';
import { DiceRollerPort } from '../../../domain/session/dice-roller.port';
import { GameSessionRepository } from '../../../domain/session/game-session.repository';
import { InviteCodeGeneratorPort } from '../../../domain/session/invite-code-generator.port';
import { LlmGameMasterPort } from '../../../domain/session/llm-game-master.port';
import { SceneResolverPort } from '../../../domain/session/scene-resolver.port';
import { SessionPlayerRepository } from '../../../domain/session/session-player.repository';
import { TurnResolutionRepository } from '../../../domain/session/turn-resolution.repository';
import { TurnSubmissionRepository } from '../../../domain/session/turn-submission.repository';
import { MapPinRepository } from '../../../domain/world-map/map-pin.repository';
import { WorldMapRepository } from '../../../domain/world-map/world-map.repository';
import { TypeOrmCharacterCreationSessionRepository } from '../../../infrastructure/character-creation/typeorm-character-creation-session.repository';
import { CharacterCreationSessionOrmEntity } from '../../../infrastructure/persistence/entities/character-creation-session.orm-entity';
import { CharacterOrmEntity } from '../../../infrastructure/persistence/entities/character.orm-entity';
import { GameSessionOrmEntity } from '../../../infrastructure/persistence/entities/game-session.orm-entity';
import { GameSystemOrmEntity } from '../../../infrastructure/persistence/entities/game-system.orm-entity';
import { MapPinOrmEntity } from '../../../infrastructure/persistence/entities/map-pin.orm-entity';
import { PendingCharacterDeltaOrmEntity } from '../../../infrastructure/persistence/entities/pending-character-delta.orm-entity';
import { SessionPlayerOrmEntity } from '../../../infrastructure/persistence/entities/session-player.orm-entity';
import { TurnResolutionOrmEntity } from '../../../infrastructure/persistence/entities/turn-resolution.orm-entity';
import { TurnSubmissionOrmEntity } from '../../../infrastructure/persistence/entities/turn-submission.orm-entity';
import { WorldMapOrmEntity } from '../../../infrastructure/persistence/entities/world-map.orm-entity';
import { TypeOrmCharacterRepository } from '../../../infrastructure/persistence/repositories/typeorm-character.repository';
import { TypeOrmGameSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-session.repository';
import { TypeOrmGameSystemRepository } from '../../../infrastructure/persistence/repositories/typeorm-game-system.repository';
import { TypeOrmMapPinRepository } from '../../../infrastructure/persistence/repositories/typeorm-map-pin.repository';
import { TypeOrmPendingCharacterDeltaRepository } from '../../../infrastructure/persistence/repositories/typeorm-pending-character-delta.repository';
import { TypeOrmSessionPlayerRepository } from '../../../infrastructure/persistence/repositories/typeorm-session-player.repository';
import { TypeOrmTurnResolutionRepository } from '../../../infrastructure/persistence/repositories/typeorm-turn-resolution.repository';
import { TypeOrmTurnSubmissionRepository } from '../../../infrastructure/persistence/repositories/typeorm-turn-submission.repository';
import { TypeOrmWorldMapRepository } from '../../../infrastructure/persistence/repositories/typeorm-world-map.repository';
import { ClaudeGameMasterAdapter } from '../../../infrastructure/session/claude-game-master.adapter';
import { OpenAiGameMasterAdapter } from '../../../infrastructure/session/openai-game-master.adapter';
import { RandomDiceRollerAdapter } from '../../../infrastructure/session/random-dice-roller.adapter';
import { RandomInviteCodeGenerator } from '../../../infrastructure/session/random-invite-code-generator';
import { SessionController } from '../controllers/session.controller';
import { UsageQuotaModule } from './usage-quota.module';
import { UserProfileModule } from './user-profile.module';

/** Selects the active `LlmGameMasterPort` adapter from `LLM_PROVIDER` (see `.env.example`). Defaults to Claude. */
function llmGameMasterProviderFactory(
  config: ConfigService,
  claude: ClaudeGameMasterAdapter,
  openai: OpenAiGameMasterAdapter,
): LlmGameMasterPort {
  const provider = config.get<string>('LLM_PROVIDER', 'claude');
  if (provider === 'openai') {
    return openai;
  }
  return claude;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSessionOrmEntity,
      SessionPlayerOrmEntity,
      TurnSubmissionOrmEntity,
      TurnResolutionOrmEntity,
      CharacterOrmEntity,
      GameSystemOrmEntity,
      PendingCharacterDeltaOrmEntity,
      CharacterCreationSessionOrmEntity,
      // Needed only by `DeleteSessionCascade` (deletes a session's
      // `WorldMap`/`MapPin`s too) - duplicated here from `WorldMapModule`,
      // matching the existing pattern of that module also duplicating
      // `GameSessionRepository`/`SessionPlayerRepository`/`GameSystemRepository`.
      WorldMapOrmEntity,
      MapPinOrmEntity,
    ]),
    UserProfileModule,
    // Provides `UsageQuotaPort`, consumed by `ResolveSceneUseCase` and
    // `MaintainRollingSummaryUseCase` below - see
    // `tasks/08-admin-quotas-cost-guardrails.md`.
    UsageQuotaModule,
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
    {
      provide: PendingCharacterDeltaRepository,
      useClass: TypeOrmPendingCharacterDeltaRepository,
    },
    {
      provide: CharacterCreationSessionRepository,
      useClass: TypeOrmCharacterCreationSessionRepository,
    },
    { provide: WorldMapRepository, useClass: TypeOrmWorldMapRepository },
    { provide: MapPinRepository, useClass: TypeOrmMapPinRepository },
    { provide: InviteCodeGeneratorPort, useClass: RandomInviteCodeGenerator },
    { provide: DiceRollerPort, useClass: RandomDiceRollerAdapter },
    // Concrete LLM adapters registered under their own class token so the
    // factory below can pick one at runtime (see CLAUDE.md - adapter
    // selection driven by config, not a framework/env branch in application/).
    ClaudeGameMasterAdapter,
    OpenAiGameMasterAdapter,
    {
      provide: LlmGameMasterPort,
      useFactory: llmGameMasterProviderFactory,
      inject: [ConfigService, ClaudeGameMasterAdapter, OpenAiGameMasterAdapter],
    },
    // Replaces the 03-session-engine stub (`ConcatenatingSceneResolver`)
    // with the real LLM-backed resolver - see `ResolveSceneUseCase` doc
    // comment. `SubmitTurnActionUseCase` is unchanged by this swap.
    { provide: SceneResolverPort, useClass: ResolveSceneUseCase },
    CreateSessionUseCase,
    JoinSessionUseCase,
    DeleteSessionCascade,
    DeleteSoloSessionUseCase,
    LeaveSessionUseCase,
    SubmitTurnActionUseCase,
    GetSessionStateUseCase,
    ListSessionsForUserUseCase,
    MaintainRollingSummaryUseCase,
    ApplyCharacterDeltaUseCase,
    ValidateCharacterDeltaUseCase,
    RejectCharacterDeltaUseCase,
  ],
  // Reused by `CharacterCreationModule` (imports this module) so its own
  // use-cases (send message / finalize / get) don't need to redeclare the
  // `LlmGameMasterPort` provider-selection factory or duplicate repository
  // bindings.
  exports: [
    CharacterCreationSessionRepository,
    GameSystemRepository,
    CharacterRepository,
    SessionPlayerRepository,
    LlmGameMasterPort,
  ],
})
export class SessionModule {}
