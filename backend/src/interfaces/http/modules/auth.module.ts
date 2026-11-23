import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticateLogoutWebhookUseCase } from '../../../application/auth/authenticate-logout-webhook.use-case';
import { HandleOAuthCallbackUseCase } from '../../../application/auth/handle-oauth-callback.use-case';
import { HandleSessionRevokedUseCase } from '../../../application/auth/handle-session-revoked.use-case';
import { AccessTokenVerifier } from '../../../domain/auth/access-token-verifier';
import { OAuthClient } from '../../../domain/auth/oauth-client';
import { WebhookSignatureVerifier } from '../../../domain/auth/webhook-signature';
import { ClockPort } from '../../../domain/shared/clock.port';
import { FeatureFlags } from '../../../domain/shared/feature-flags';
import { RevokedSessionRepository } from '../../../domain/auth/revoked-session.repository';
import { UserRepository } from '../../../domain/user/user.repository';
import { HttpOAuthClient } from '../../../infrastructure/auth/http-oauth-client';
import { SingleFlightOAuthClient } from '../../../infrastructure/auth/single-flight-oauth-client';
import { JwksAccessTokenVerifier } from '../../../infrastructure/auth/jwks-access-token-verifier';
import { SystemClockAdapter } from '../../../infrastructure/shared/system-clock.adapter';
import { RevokedSessionOrmEntity } from '../../../infrastructure/persistence/entities/revoked-session.orm-entity';
import { UserOrmEntity } from '../../../infrastructure/persistence/entities/user.orm-entity';
import { TypeOrmRevokedSessionRepository } from '../../../infrastructure/persistence/repositories/typeorm-revoked-session.repository';
import { TypeOrmUserRepository } from '../../../infrastructure/persistence/repositories/typeorm-user.repository';
import { AuthController } from '../controllers/auth.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, RevokedSessionOrmEntity])],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    {
      provide: RevokedSessionRepository,
      useClass: TypeOrmRevokedSessionRepository,
    },
    {
      provide: OAuthClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SingleFlightOAuthClient(new HttpOAuthClient(config)),
    },
    { provide: AccessTokenVerifier, useClass: JwksAccessTokenVerifier },
    HandleOAuthCallbackUseCase,
    HandleSessionRevokedUseCase,
    { provide: ClockPort, useClass: SystemClockAdapter },
    {
      provide: AuthenticateLogoutWebhookUseCase,
      inject: [ConfigService, ClockPort, FeatureFlags],
      useFactory: (
        config: ConfigService,
        clock: ClockPort,
        flags: FeatureFlags,
      ) => {
        // Optional (validated at startup): without it, only the legacy ?secret= authenticates the webhook.
        const signingSecret = config.get<string>('AUTH_WEBHOOK_SIGNING_SECRET');
        return new AuthenticateLogoutWebhookUseCase(
          signingSecret
            ? new WebhookSignatureVerifier(signingSecret, clock)
            : null,
          config.get<string>('AUTH_WEBHOOK_SECRET', ''),
          flags,
          clock,
        );
      },
    },
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [UserRepository],
})
export class AuthModule {}
