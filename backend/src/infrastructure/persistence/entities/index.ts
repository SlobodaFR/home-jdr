import { AppSettingOrmEntity } from './app-setting.orm-entity';
import { CharacterCreationSessionOrmEntity } from './character-creation-session.orm-entity';
import { CharacterOrmEntity } from './character.orm-entity';
import { GameSessionOrmEntity } from './game-session.orm-entity';
import { GameSystemOrmEntity } from './game-system.orm-entity';
import { LlmUsageRecordOrmEntity } from './llm-usage-record.orm-entity';
import { MapPinOrmEntity } from './map-pin.orm-entity';
import { PendingCharacterDeltaOrmEntity } from './pending-character-delta.orm-entity';
import { PushSubscriptionOrmEntity } from './push-subscription.orm-entity';
import { RevokedSessionOrmEntity } from './revoked-session.orm-entity';
import { SessionPlayerOrmEntity } from './session-player.orm-entity';
import { TurnResolutionOrmEntity } from './turn-resolution.orm-entity';
import { TurnSubmissionOrmEntity } from './turn-submission.orm-entity';
import { UserProfileOrmEntity } from './user-profile.orm-entity';
import { UserOrmEntity } from './user.orm-entity';
import { WorldMapOrmEntity } from './world-map.orm-entity';

/** Single list of persisted entities: database module, migrations and tests. */
export const ENTITIES = [
  AppSettingOrmEntity,
  CharacterCreationSessionOrmEntity,
  CharacterOrmEntity,
  GameSessionOrmEntity,
  GameSystemOrmEntity,
  LlmUsageRecordOrmEntity,
  MapPinOrmEntity,
  PendingCharacterDeltaOrmEntity,
  PushSubscriptionOrmEntity,
  RevokedSessionOrmEntity,
  SessionPlayerOrmEntity,
  TurnResolutionOrmEntity,
  TurnSubmissionOrmEntity,
  UserProfileOrmEntity,
  UserOrmEntity,
  WorldMapOrmEntity,
];
