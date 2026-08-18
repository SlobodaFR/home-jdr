import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class HitPointsSchemaDto {
  @IsInt()
  @Min(1)
  defaultMax!: number;
}

export class InventorySchemaDto {
  @IsArray()
  @IsString({ each: true })
  defaultItems!: string[];
}

export class CustomAttributeDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsIn(['number', 'text'])
  type!: 'number' | 'text';

  // Cross-checked against `type` by the domain (see
  // domain/game-system/character-sheet-schema.ts) - class-validator alone
  // cannot express "number when type=number, string when type=text".
  @IsNotEmpty()
  default!: number | string;
}

export class CharacterSheetSchemaDto {
  @ValidateNested()
  @Type(() => HitPointsSchemaDto)
  hitPoints!: HitPointsSchemaDto;

  @ValidateNested()
  @Type(() => InventorySchemaDto)
  inventory!: InventorySchemaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomAttributeDto)
  customAttributes!: CustomAttributeDto[];
}
