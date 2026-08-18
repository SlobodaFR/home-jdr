import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateMapPinDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  positionY?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
