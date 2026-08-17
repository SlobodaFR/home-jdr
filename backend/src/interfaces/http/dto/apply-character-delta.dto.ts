import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ApplyCharacterDeltaDto {
  @IsOptional()
  @IsInt()
  hitPoints?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inventoryAdd?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inventoryRemove?: string[];

  @IsOptional()
  @IsObject()
  customAttributeChanges?: Record<string, number | string>;
}
