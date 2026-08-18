import { Body, Controller, Get, Param, Post, UseFilters } from '@nestjs/common';
import { FinalizeCharacterCreationUseCase } from '../../../application/character-creation/finalize-character-creation.use-case';
import { GetCharacterCreationSessionUseCase } from '../../../application/character-creation/get-character-creation-session.use-case';
import { SendCharacterCreationMessageUseCase } from '../../../application/character-creation/send-character-creation-message.use-case';
import {
  CharacterCreationDraft,
  CharacterCreationMessage,
  CharacterCreationSession,
  CharacterCreationStatus,
} from '../../../domain/character-creation/character-creation-session';
import { Character } from '../../../domain/character/character';
import { SessionPlayer } from '../../../domain/session/session-player';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { SendCharacterCreationMessageDto } from '../dto/send-character-creation-message.dto';
import { QuotaExceededFilter } from '../filters/quota-exceeded.filter';
import { CharacterResponse } from './character.controller';

interface CharacterCreationSessionResponse {
  id: string;
  gameSessionId: string;
  gameSystemId: string;
  userId: string;
  status: CharacterCreationStatus;
  messages: CharacterCreationMessage[];
  draftCharacter: CharacterCreationDraft;
  createdAt: Date;
  updatedAt: Date;
}

interface FinalizeCharacterCreationResponse {
  character: CharacterResponse;
  sessionPlayer: {
    sessionId: string;
    userId: string;
    characterId: string;
    joinedAt: Date;
  };
}

function toCreationSessionResponse(
  creationSession: CharacterCreationSession,
): CharacterCreationSessionResponse {
  return {
    id: creationSession.id,
    gameSessionId: creationSession.gameSessionId,
    gameSystemId: creationSession.gameSystemId,
    userId: creationSession.userId,
    status: creationSession.status,
    messages: creationSession.messages,
    draftCharacter: creationSession.draftCharacter,
    createdAt: creationSession.createdAt,
    updatedAt: creationSession.updatedAt,
  };
}

function toCharacterResponse(character: Character): CharacterResponse {
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

function toSessionPlayerResponse(sessionPlayer: SessionPlayer) {
  return {
    sessionId: sessionPlayer.sessionId,
    userId: sessionPlayer.userId,
    characterId: sessionPlayer.characterId,
    joinedAt: sessionPlayer.joinedAt,
  };
}

/**
 * Guided AI character-creation chat: a player exchanges messages with the
 * LLM game master to build up their `Character` sheet before finalizing it
 * (see `PRD.md` addendum - "Character creation is a guided AI
 * conversation"). `QuotaExceededError` thrown from
 * `SendCharacterCreationMessageUseCase` is translated to HTTP 429 by
 * `QuotaExceededFilter`, exactly like turn submission on `SessionController`.
 */
@Controller('character-creation-sessions')
export class CharacterCreationController {
  constructor(
    private readonly getCharacterCreationSession: GetCharacterCreationSessionUseCase,
    private readonly sendCharacterCreationMessage: SendCharacterCreationMessageUseCase,
    private readonly finalizeCharacterCreation: FinalizeCharacterCreationUseCase,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CharacterCreationSessionResponse> {
    const creationSession = await this.getCharacterCreationSession.execute(
      id,
      user.id,
    );
    return toCreationSessionResponse(creationSession);
  }

  @UseFilters(QuotaExceededFilter)
  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendCharacterCreationMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<CharacterCreationSessionResponse> {
    const creationSession = await this.sendCharacterCreationMessage.execute({
      characterCreationSessionId: id,
      userId: user.id,
      message: dto.message,
    });
    return toCreationSessionResponse(creationSession);
  }

  @Post(':id/finalize')
  async finalize(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<FinalizeCharacterCreationResponse> {
    const { character, sessionPlayer } =
      await this.finalizeCharacterCreation.execute({
        characterCreationSessionId: id,
        userId: user.id,
      });
    return {
      character: toCharacterResponse(character),
      sessionPlayer: toSessionPlayerResponse(sessionPlayer),
    };
  }
}
