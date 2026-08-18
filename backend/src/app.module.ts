import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { AuthModule } from './interfaces/http/modules/auth.module';
import { CharacterModule } from './interfaces/http/modules/character.module';
import { GameSystemModule } from './interfaces/http/modules/game-system.module';
import { PushSubscriptionModule } from './interfaces/http/modules/push-subscription.module';
import { SessionModule } from './interfaces/http/modules/session.module';
import { UserProfileModule } from './interfaces/http/modules/user-profile.module';
import { WorldMapModule } from './interfaces/http/modules/world-map.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global domain-event bus (e.g. `TurnResolvedEvent`, emitted by
    // `SubmitTurnActionUseCase`, consumed by
    // `NotifyPlayersTurnPendingUseCase` - see `06-notifications-push.md`).
    EventEmitterModule.forRoot(),
    DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      exclude: ['/api*'],
    }),
    AuthModule,
    CharacterModule,
    UserProfileModule,
    GameSystemModule,
    SessionModule,
    WorldMapModule,
    PushSubscriptionModule,
  ],
})
export class AppModule {}
