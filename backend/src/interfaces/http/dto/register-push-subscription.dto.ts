import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PushSubscriptionKeysDto } from './push-subscription-keys.dto';

export class RegisterPushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}
