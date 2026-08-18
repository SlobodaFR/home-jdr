import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const DICE_FORMULA_PATTERN = /^\d+d\d+([+-]\d+)?$/i;

export class MechanicalActionDto {
  @IsString()
  @IsNotEmpty()
  actionKey!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @Matches(DICE_FORMULA_PATTERN, {
    message: 'diceFormula must look like "1d20" or "1d20+3"',
  })
  diceFormula!: string;

  @IsOptional()
  @IsString()
  relatedStat?: string;
}
