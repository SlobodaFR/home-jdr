import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CharacterSheetSchemaDto } from './character-sheet-schema.dto';
import { MechanicalActionDto } from './mechanical-action.dto';
import { parseMultipartJson } from './parse-multipart-json';

export class CreateGameSystemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  description!: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  adaptedForChildren!: boolean;

  @Transform(parseMultipartJson(CharacterSheetSchemaDto))
  @ValidateNested()
  @Type(() => CharacterSheetSchemaDto)
  characterSheetSchema!: CharacterSheetSchemaDto;

  @Transform(parseMultipartJson(MechanicalActionDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MechanicalActionDto)
  mechanicalActions!: MechanicalActionDto[];
}
