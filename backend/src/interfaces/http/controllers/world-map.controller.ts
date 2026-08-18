import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AddMapPinUseCase } from '../../../application/world-map/add-map-pin.use-case';
import { GenerateWorldMapUseCase } from '../../../application/world-map/generate-world-map.use-case';
import {
  GetWorldMapUseCase,
  WorldMapView,
} from '../../../application/world-map/get-world-map.use-case';
import { RemoveMapPinUseCase } from '../../../application/world-map/remove-map-pin.use-case';
import { UpdateMapPinUseCase } from '../../../application/world-map/update-map-pin.use-case';
import { MapPin } from '../../../domain/world-map/map-pin';
import { WorldMap } from '../../../domain/world-map/world-map';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../decorators/current-user.decorator';
import { AddMapPinDto } from '../dto/add-map-pin.dto';
import { GenerateWorldMapDto } from '../dto/generate-world-map.dto';
import { UpdateMapPinDto } from '../dto/update-map-pin.dto';

interface MapPinResponse {
  id: string;
  worldMapId: string;
  label: string;
  positionX: number;
  positionY: number;
  notes: string;
  createdByUserId: string;
  createdAt: Date;
}

interface WorldMapResponse {
  id: string;
  sessionId: string;
  /**
   * Displayable URL built from the stored object-storage key (see
   * `ObjectStoragePort`) - never the raw third-party generation URL, which
   * is never persisted (see PRD.md).
   */
  imageUrl: string | null;
  generationPrompt: string;
  createdAt: Date;
}

interface WorldMapViewResponse {
  worldMap: WorldMapResponse | null;
  pins: MapPinResponse[];
}

function toPinResponse(pin: MapPin): MapPinResponse {
  return {
    id: pin.id,
    worldMapId: pin.worldMapId,
    label: pin.label,
    positionX: pin.positionX,
    positionY: pin.positionY,
    notes: pin.notes,
    createdByUserId: pin.createdByUserId,
    createdAt: pin.createdAt,
  };
}

@Controller('sessions/:id/world-map')
export class WorldMapController {
  constructor(
    private readonly generateWorldMap: GenerateWorldMapUseCase,
    private readonly getWorldMap: GetWorldMapUseCase,
    private readonly addMapPin: AddMapPinUseCase,
    private readonly updateMapPin: UpdateMapPinUseCase,
    private readonly removeMapPin: RemoveMapPinUseCase,
    private readonly config: ConfigService,
  ) {}

  private toWorldMapResponse(worldMap: WorldMap): WorldMapResponse {
    return {
      id: worldMap.id,
      sessionId: worldMap.sessionId,
      imageUrl: this.buildImageUrl(worldMap.imageStorageKey),
      generationPrompt: worldMap.generationPrompt,
      createdAt: worldMap.createdAt,
    };
  }

  private buildImageUrl(imageStorageKey: string): string | null {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT');
    const bucket = this.config.get<string>('MINIO_BUCKET');
    if (!endpoint || !bucket) {
      return null;
    }
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${imageStorageKey}`;
  }

  @Post()
  async generate(
    @Param('id') id: string,
    @Body() dto: GenerateWorldMapDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<WorldMapResponse> {
    const worldMap = await this.generateWorldMap.execute({
      sessionId: id,
      userId: user.id,
      description: dto.description,
    });
    return this.toWorldMapResponse(worldMap);
  }

  @Get()
  async get(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<WorldMapViewResponse> {
    const view: WorldMapView | null = await this.getWorldMap.execute({
      sessionId: id,
      userId: user.id,
    });
    return {
      worldMap: view ? this.toWorldMapResponse(view.worldMap) : null,
      pins: view ? view.pins.map(toPinResponse) : [],
    };
  }

  @Post('pins')
  async addPin(
    @Param('id') id: string,
    @Body() dto: AddMapPinDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MapPinResponse> {
    const pin = await this.addMapPin.execute({
      sessionId: id,
      userId: user.id,
      label: dto.label,
      positionX: dto.positionX,
      positionY: dto.positionY,
      notes: dto.notes,
    });
    return toPinResponse(pin);
  }

  @Patch('pins/:pinId')
  async updatePin(
    @Param('id') id: string,
    @Param('pinId') pinId: string,
    @Body() dto: UpdateMapPinDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<MapPinResponse> {
    const pin = await this.updateMapPin.execute({
      sessionId: id,
      userId: user.id,
      pinId,
      label: dto.label,
      positionX: dto.positionX,
      positionY: dto.positionY,
      notes: dto.notes,
    });
    return toPinResponse(pin);
  }

  @Delete('pins/:pinId')
  async removePin(
    @Param('id') id: string,
    @Param('pinId') pinId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ deleted: true }> {
    await this.removeMapPin.execute({ sessionId: id, userId: user.id, pinId });
    return { deleted: true };
  }
}
