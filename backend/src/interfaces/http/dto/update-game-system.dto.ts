import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CharacterSheetSchemaDto } from './character-sheet-schema.dto';
import { MechanicalActionDto } from './mechanical-action.dto';
import { parseMultipartJson } from './parse-multipart-json';

export class UpdateGameSystemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  adaptedForChildren?: boolean;

  @IsOptional()
  @Transform(parseMultipartJson(CharacterSheetSchemaDto))
  @ValidateNested()
  @Type(() => CharacterSheetSchemaDto)
  characterSheetSchema?: CharacterSheetSchemaDto;

  @IsOptional()
  @Transform(parseMultipartJson(MechanicalActionDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MechanicalActionDto)
  mechanicalActions?: MechanicalActionDto[];
}
