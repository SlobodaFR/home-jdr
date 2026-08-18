import { IsNotEmpty, IsString } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;

  @IsString()
  @IsNotEmpty()
  characterName!: string;
}
