import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeletePushSubscriptionUseCase } from '../../../application/push-subscription/delete-push-subscription.use-case';
import { NotifyPlayersTurnPendingUseCase } from '../../../application/push-subscription/notify-players-turn-pending.use-case';
import { RegisterPushSubscriptionUseCase } from '../../../application/push-subscription/register-push-subscription.use-case';
import { PushNotificationPort } from '../../../domain/push-subscription/push-notification.port';
import { PushSubscriptionRepository } from '../../../domain/push-subscription/push-subscription.repository';
import { PushSubscriptionOrmEntity } from '../../../infrastructure/persistence/entities/push-subscription.orm-entity';
import { TypeOrmPushSubscriptionRepository } from '../../../infrastructure/persistence/repositories/typeorm-push-subscription.repository';
import { WebPushAdapter } from '../../../infrastructure/push-notification/web-push-adapter';
import { PushSubscriptionController } from '../controllers/push-subscription.controller';

/**
 * `NotifyPlayersTurnPendingUseCase` is registered as a provider here (not
 * exported/called directly): its `@OnEvent(TURN_RESOLVED_EVENT)` method is
 * auto-discovered by `EventEmitterModule` (registered globally in
 * `AppModule`) as soon as this module is loaded, decoupling it from
 * `SessionModule` - see `tasks/06-notifications-push.md`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionOrmEntity])],
  controllers: [PushSubscriptionController],
  providers: [
    {
      provide: PushSubscriptionRepository,
      useClass: TypeOrmPushSubscriptionRepository,
    },
    { provide: PushNotificationPort, useClass: WebPushAdapter },
    RegisterPushSubscriptionUseCase,
    DeletePushSubscriptionUseCase,
    NotifyPlayersTurnPendingUseCase,
  ],
})
export class PushSubscriptionModule {}
