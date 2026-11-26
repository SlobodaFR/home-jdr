import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema as created by `synchronize: true` until now. IF NOT EXISTS everywhere: on the existing
 * production database this migration changes nothing and only records itself; on an empty
 * database it creates the schema. Hand-written: raw `migration:generate` output (no IF NOT
 * EXISTS) would crash on the production database.
 *
 * The trailing space after the index column lists is what TypeORM writes: kept so sqlite_master
 * is byte-identical to a synchronize-built database.
 *
 * Only ever use the `queryRunner` passed in (never `dataSource.query`): migrations run on the
 * serialized connection. There is deliberately no CLI data source, and `down()` refuses to run: it would drop the data.
 */
export class InitialSchema1795700000000 implements MigrationInterface {
  name = 'InitialSchema1795700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "app_settings" ("key" text PRIMARY KEY NOT NULL, "value" text NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "character_creation_sessions" ("id" text PRIMARY KEY NOT NULL, "game_session_id" text NOT NULL, "game_system_id" text NOT NULL, "user_id" text NOT NULL, "status" text NOT NULL, "messages" text NOT NULL, "draft_character" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "characters" ("id" text PRIMARY KEY NOT NULL, "game_system_id" text NOT NULL, "session_id" text NOT NULL, "owner_user_id" text NOT NULL, "name" text NOT NULL, "hit_points_max" integer NOT NULL, "hit_points_current" integer NOT NULL, "inventory" text NOT NULL, "custom_attributes" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "game_sessions" ("id" text PRIMARY KEY NOT NULL, "game_system_id" text NOT NULL, "name" text NOT NULL, "invite_code" text NOT NULL, "status" text NOT NULL, "current_turn_number" integer NOT NULL, "rolling_summary" text NOT NULL, "created_by_user_id" text NOT NULL, "characters_visible_to_others" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "opening_narration_text" text)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "game_systems" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "description" text NOT NULL, "adapted_for_children" boolean NOT NULL, "rules_text" text NOT NULL, "rules_source_file_name" text NOT NULL, "character_sheet_schema" text NOT NULL, "mechanical_actions" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "llm_usage_records" ("id" text PRIMARY KEY NOT NULL, "session_id" text NOT NULL, "turn_number" integer NOT NULL, "provider" text NOT NULL, "call_type" text NOT NULL, "occurred_at" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "map_pins" ("id" text PRIMARY KEY NOT NULL, "world_map_id" text NOT NULL, "label" text NOT NULL, "position_x" real NOT NULL, "position_y" real NOT NULL, "notes" text NOT NULL, "created_by_user_id" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pending_character_deltas" ("id" text PRIMARY KEY NOT NULL, "session_id" text NOT NULL, "turn_number" integer NOT NULL, "character_id" text NOT NULL, "delta_payload" text NOT NULL, "status" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "push_subscriptions" ("id" text PRIMARY KEY NOT NULL, "user_id" text NOT NULL, "endpoint" text NOT NULL, "keys" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "revoked_sessions" ("user_id" text PRIMARY KEY NOT NULL, "revoked_at" datetime NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "session_players" ("session_id" text NOT NULL, "user_id" text NOT NULL, "character_id" text NOT NULL, "joined_at" datetime NOT NULL DEFAULT (datetime('now')), PRIMARY KEY ("session_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "turn_resolutions" ("id" text PRIMARY KEY NOT NULL, "session_id" text NOT NULL, "turn_number" integer NOT NULL, "narration_text" text NOT NULL, "dice_rolls" text NOT NULL DEFAULT ('[]'), "resolved_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "turn_submissions" ("id" text PRIMARY KEY NOT NULL, "session_id" text NOT NULL, "turn_number" integer NOT NULL, "player_id" text NOT NULL, "action_text" text NOT NULL, "mechanical_action_key" text, "submitted_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_profiles" ("user_id" text PRIMARY KEY NOT NULL, "role" text NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" ("id" text PRIMARY KEY NOT NULL, "email" text NOT NULL, "name" text NOT NULL, "avatar_url" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "world_maps" ("id" text PRIMARY KEY NOT NULL, "session_id" text NOT NULL, "image_storage_key" text NOT NULL, "generation_prompt" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_662664d64b131d02fb74ccfbd4" ON "turn_submissions" ("session_id", "turn_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6771f119f1c06d2ccf38f23866" ON "push_subscriptions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_67b56c4d67058ba27825cf9af9" ON "world_maps" ("session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_73910b0c54017e03c243e0cce6" ON "pending_character_deltas" ("character_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7f3309789872cdec0e9ef27c0c" ON "character_creation_sessions" ("game_session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_87b07644acab856e1fae437c31" ON "turn_resolutions" ("session_id", "turn_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bec94b9b8ecb9167cb981c7a17" ON "characters" ("session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c9052833e065e91158d1a2c8ec" ON "map_pins" ("world_map_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cc8e35524877ee60b202166e4f" ON "character_creation_sessions" ("game_session_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cf20c3cf5b08064a4df667a42b" ON "session_players" ("character_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e9787253cc14abae39831705bf" ON "pending_character_deltas" ("session_id", "turn_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f716881996f2c585500ca0cfcd" ON "game_sessions" ("created_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_fc8db77f31bad6977380b54b51" ON "game_sessions" ("invite_code") `,
    );
  }

  // Reverting the baseline would drop every table, and the data with them.
  down(): Promise<void> {
    return Promise.reject(
      new Error('baseline migration: revert not supported, restore a backup'),
    );
  }
}
