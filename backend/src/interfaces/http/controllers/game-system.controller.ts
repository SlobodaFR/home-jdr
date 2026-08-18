import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { CreateGameSystemUseCase } from '../../../application/game-system/create-game-system.use-case';
import { DeleteGameSystemUseCase } from '../../../application/game-system/delete-game-system.use-case';
import { GetGameSystemUseCase } from '../../../application/game-system/get-game-system.use-case';
import { ListGameSystemsUseCase } from '../../../application/game-system/list-game-systems.use-case';
import { UpdateGameSystemUseCase } from '../../../application/game-system/update-game-system.use-case';
import { GetOrCreateUserProfileUseCase } from '../../../application/user/get-or-create-user-profile.use-case';
import { GameSystem } from '../../../domain/game-system/game-system';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { CreateGameSystemDto } from '../dto/create-game-system.dto';
import { UpdateGameSystemDto } from '../dto/update-game-system.dto';
import { MulterExceptionFilter } from '../filters/multer-exception.filter';
import { rulesPdfUploadOptions } from '../game-system-upload.options';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { resolveDefaultRole } from '../user-role-policy';

interface GameSystemResponse {
  id: string;
  name: string;
  description: string;
  adaptedForChildren: boolean;
  rulesText: string;
  rulesSourceFileName: string;
  characterSheetSchema: GameSystem['characterSheetSchema'];
  mechanicalActions: GameSystem['mechanicalActions'];
  createdAt: Date;
}

function toResponse(gameSystem: GameSystem): GameSystemResponse {
  return {
    id: gameSystem.id,
    name: gameSystem.name,
    description: gameSystem.description,
    adaptedForChildren: gameSystem.adaptedForChildren,
    rulesText: gameSystem.rulesText,
    rulesSourceFileName: gameSystem.rulesSourceFileName,
    characterSheetSchema: gameSystem.characterSheetSchema,
    mechanicalActions: gameSystem.mechanicalActions,
    createdAt: gameSystem.createdAt,
  };
}

@Controller('game-systems')
export class GameSystemController {
  constructor(
    private readonly createGameSystem: CreateGameSystemUseCase,
    private readonly updateGameSystem: UpdateGameSystemUseCase,
    private readonly deleteGameSystem: DeleteGameSystemUseCase,
    private readonly listGameSystems: ListGameSystemsUseCase,
    private readonly getGameSystem: GetGameSystemUseCase,
    private readonly getOrCreateUserProfile: GetOrCreateUserProfileUseCase,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GameSystemResponse[]> {
    const profile = await this.getOrCreateUserProfile.execute(
      user.id,
      resolveDefaultRole(user.email, this.config),
    );
    const gameSystems = await this.listGameSystems.execute(profile.role);
    return gameSystems.map(toResponse);
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GameSystemResponse> {
    const profile = await this.getOrCreateUserProfile.execute(
      user.id,
      resolveDefaultRole(user.email, this.config),
    );
    const gameSystem = await this.getGameSystem.execute(id, profile.role);
    if (!gameSystem) {
      throw new NotFoundException();
    }
    return toResponse(gameSystem);
  }

  @UseGuards(AdminRoleGuard)
  @UseFilters(MulterExceptionFilter)
  @Post()
  @UseInterceptors(FileInterceptor('rulesFile', rulesPdfUploadOptions))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateGameSystemDto,
  ): Promise<GameSystemResponse> {
    if (!file) {
      throw new BadRequestException('rulesFile is required');
    }
    try {
      const gameSystem = await this.createGameSystem.execute({
        name: dto.name,
        description: dto.description,
        adaptedForChildren: dto.adaptedForChildren,
        rulesFileBuffer: file.buffer,
        rulesSourceFileName: file.originalname,
        characterSheetSchema: dto.characterSheetSchema,
        mechanicalActions: dto.mechanicalActions,
      });
      return toResponse(gameSystem);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid game system',
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @UseFilters(MulterExceptionFilter)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('rulesFile', rulesPdfUploadOptions))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateGameSystemDto,
  ): Promise<GameSystemResponse> {
    try {
      const gameSystem = await this.updateGameSystem.execute(id, {
        name: dto.name,
        description: dto.description,
        adaptedForChildren: dto.adaptedForChildren,
        characterSheetSchema: dto.characterSheetSchema,
        mechanicalActions: dto.mechanicalActions,
        rulesFileBuffer: file?.buffer,
        rulesSourceFileName: file?.originalname,
      });
      if (!gameSystem) {
        throw new NotFoundException();
      }
      return toResponse(gameSystem);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid game system',
      );
    }
  }

  @UseGuards(AdminRoleGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteGameSystem.execute({ gameSystemId: id });
  }
}
