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

class HitPointsBaseAttributeDto {
  @IsInt()
  @Min(1)
  max!: number;
}

class BaseAttributesDto {
  @ValidateNested()
  @Type(() => HitPointsBaseAttributeDto)
  hitPoints!: HitPointsBaseAttributeDto;

  @IsArray()
  @IsString({ each: true })
  inventory!: string[];
}

class CustomAttributeSchemaDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsIn(['number', 'string'])
  type!: 'number' | 'string';

  default!: number | string;
}

class CharacterSheetSchemaDto {
  @ValidateNested()
  @Type(() => BaseAttributesDto)
  baseAttributes!: BaseAttributesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomAttributeSchemaDto)
  customAttributes!: CustomAttributeSchemaDto[];
}

export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  gameSystemId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateNested()
  @Type(() => CharacterSheetSchemaDto)
  schema!: CharacterSheetSchemaDto;
}
