import { IsNotEmpty, IsString } from 'class-validator';

export class SendCharacterCreationMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
