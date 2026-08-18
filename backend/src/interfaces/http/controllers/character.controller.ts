import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApplyCharacterDeltaUseCase } from '../../../application/character/apply-character-delta.use-case';
import { CreateCharacterUseCase } from '../../../application/character/create-character.use-case';
import { GetCharacterUseCase } from '../../../application/character/get-character.use-case';
import { ListCharactersForSessionUseCase } from '../../../application/character/list-characters-for-session.use-case';
import { Character } from '../../../domain/character/character';
import { CharacterStateDelta } from '../../../domain/character/character-state-delta';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { ApplyCharacterDeltaDto } from '../dto/apply-character-delta.dto';
import { CreateCharacterDto } from '../dto/create-character.dto';

export interface CharacterResponse {
  id: string;
  gameSystemId: string;
  sessionId: string;
  ownerUserId: string;
  name: string;
  hitPointsMax: number;
  hitPointsCurrent: number;
  inventory: { name: string; quantity: number }[];
  customAttributes: Record<string, number | string>;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(character: Character): CharacterResponse {
  return {
    id: character.id,
    gameSystemId: character.gameSystemId,
    sessionId: character.sessionId,
    ownerUserId: character.ownerUserId,
    name: character.name,
    hitPointsMax: character.hitPointsMax,
    hitPointsCurrent: character.hitPointsCurrent,
    inventory: character.inventory,
    customAttributes: character.customAttributes,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
}

@Controller()
export class CharacterController {
  constructor(
    private readonly createCharacter: CreateCharacterUseCase,
    private readonly getCharacter: GetCharacterUseCase,
    private readonly listCharactersForSession: ListCharactersForSessionUseCase,
    private readonly applyCharacterDelta: ApplyCharacterDeltaUseCase,
  ) {}

  @Post('characters')
  async create(
    @Body() dto: CreateCharacterDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CharacterResponse> {
    const character = await this.createCharacter.execute({
      gameSystemId: dto.gameSystemId,
      sessionId: dto.sessionId,
      ownerUserId: user.id,
      name: dto.name,
      schema: dto.schema,
    });
    return toResponse(character);
  }

  @Get('characters/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CharacterResponse> {
    const character = await this.getCharacter.execute(id, user.id);
    return toResponse(character);
  }

  @Get('sessions/:sessionId/characters')
  async findBySession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CharacterResponse[]> {
    const characters = await this.listCharactersForSession.execute(
      sessionId,
      user.id,
    );
    return characters.map(toResponse);
  }

  @Patch('characters/:id/delta')
  async applyDelta(
    @Param('id') id: string,
    @Body() dto: ApplyCharacterDeltaDto,
  ): Promise<CharacterResponse> {
    const delta = CharacterStateDelta.create({
      hitPoints: dto.hitPoints,
      inventoryAdd: dto.inventoryAdd,
      inventoryRemove: dto.inventoryRemove,
      customAttributeChanges: dto.customAttributeChanges,
    });
    const character = await this.applyCharacterDelta.execute(id, delta);
    return toResponse(character);
  }
}
