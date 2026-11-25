import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { validateEnv } from './infrastructure/config/validate-env';
import { FeatureFlagsModule } from './infrastructure/feature-flags/feature-flags.module';
import { loggerParams } from './infrastructure/logging/logger.config';
import { STATIC_EXCLUDE } from './interfaces/http/static-exclude';
import { HealthController } from './interfaces/http/controllers/health.controller';
import { TelemetryModule } from './infrastructure/telemetry/telemetry.module';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { SameOriginGuard } from './interfaces/http/guards/same-origin.guard';
import { throttlerOptions } from './interfaces/http/throttling';
import { AdminSessionsModule } from './interfaces/http/modules/admin-sessions.module';
import { AuthModule } from './interfaces/http/modules/auth.module';
import { CharacterCreationModule } from './interfaces/http/modules/character-creation.module';
import { CharacterModule } from './interfaces/http/modules/character.module';
import { GameSystemModule } from './interfaces/http/modules/game-system.module';
import { PushSubscriptionModule } from './interfaces/http/modules/push-subscription.module';
import { SessionModule } from './interfaces/http/modules/session.module';
import { UsageQuotaModule } from './interfaces/http/modules/usage-quota.module';
import { UserProfileModule } from './interfaces/http/modules/user-profile.module';
import { WorldMapModule } from './interfaces/http/modules/world-map.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global domain-event bus (e.g. `TurnResolvedEvent`, emitted by
    // `SubmitTurnActionUseCase`, consumed by
    // `NotifyPlayersTurnPendingUseCase` - see `06-notifications-push.md`).
    EventEmitterModule.forRoot(),
    LoggerModule.forRoot(loggerParams(process.env.NODE_ENV)),
    ThrottlerModule.forRoot(throttlerOptions),
    FeatureFlagsModule,
    TelemetryModule,
    DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      exclude: STATIC_EXCLUDE,
    }),
    AuthModule,
    CharacterModule,
    UserProfileModule,
    GameSystemModule,
    SessionModule,
    CharacterCreationModule,
    WorldMapModule,
    PushSubscriptionModule,
    UsageQuotaModule,
    AdminSessionsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Attaches the real exception to the request log (serialized through the whitelist).
    { provide: APP_INTERCEPTOR, useClass: LoggerErrorInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Every mutation must come from this origin (cookie auth); see SameOriginGuard.
    { provide: APP_GUARD, useClass: SameOriginGuard },
  ],
})
export class AppModule {}
