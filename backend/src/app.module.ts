import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { AuthModule } from './interfaces/http/modules/auth.module';
import { CharacterModule } from './interfaces/http/modules/character.module';
import { GameSystemModule } from './interfaces/http/modules/game-system.module';
import { SessionModule } from './interfaces/http/modules/session.module';
import { UserProfileModule } from './interfaces/http/modules/user-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
