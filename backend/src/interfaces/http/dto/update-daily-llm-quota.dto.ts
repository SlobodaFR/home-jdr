import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateDailyLlmQuotaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number;
}
