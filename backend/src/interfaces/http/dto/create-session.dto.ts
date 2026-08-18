import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  gameSystemId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Per-session choice, set once by the creator, immutable after - see `GameSession.charactersVisibleToOthers`. */
  @IsBoolean()
  charactersVisibleToOthers!: boolean;
}
