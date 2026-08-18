import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitTurnActionDto {
  @IsString()
  @IsNotEmpty()
  actionText!: string;
}
