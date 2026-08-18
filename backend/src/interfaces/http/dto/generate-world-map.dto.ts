import { IsOptional, IsString } from 'class-validator';

export class GenerateWorldMapDto {
  @IsOptional()
  @IsString()
  description?: string;
}
