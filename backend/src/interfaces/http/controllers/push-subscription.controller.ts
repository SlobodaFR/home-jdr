import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeletePushSubscriptionUseCase } from '../../../application/push-subscription/delete-push-subscription.use-case';
import { RegisterPushSubscriptionUseCase } from '../../../application/push-subscription/register-push-subscription.use-case';
import { PushSubscription } from '../../../domain/push-subscription/push-subscription';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { RegisterPushSubscriptionDto } from '../dto/register-push-subscription.dto';

interface PushSubscriptionResponse {
  id: string;
  endpoint: string;
  createdAt: Date;
}

function toResponse(subscription: PushSubscription): PushSubscriptionResponse {
  return {
    id: subscription.id,
    endpoint: subscription.endpoint,
    createdAt: subscription.createdAt,
  };
}

@Controller('push-subscriptions')
export class PushSubscriptionController {
  constructor(
    private readonly registerPushSubscription: RegisterPushSubscriptionUseCase,
    private readonly deletePushSubscription: DeletePushSubscriptionUseCase,
    private readonly config: ConfigService,
  ) {}

  /**
   * The VAPID *public* key is, by design, safe to ship to the browser - it
   * is what `PushManager.subscribe({ applicationServerKey })` needs
   * client-side. The private key never leaves the server (see
   * `WebPushAdapter`).
   */
  @Get('vapid-public-key')
  getVapidPublicKey(): { publicKey: string | null } {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') ?? null };
  }

  @Post()
  async register(
    @Body() dto: RegisterPushSubscriptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<PushSubscriptionResponse> {
    const subscription = await this.registerPushSubscription.execute({
      userId: user.id,
      endpoint: dto.endpoint,
      keys: { p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
    return toResponse(subscription);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.deletePushSubscription.execute(id, user.id);
  }
}
