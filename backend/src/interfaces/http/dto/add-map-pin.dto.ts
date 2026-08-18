import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AddMapPinDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  positionX!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  positionY!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
