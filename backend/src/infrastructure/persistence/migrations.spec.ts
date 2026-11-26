import { mkdtempSync, readdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';
import { InitialSchema1795700000000 } from './migrations/1795700000000-InitialSchema';

function dataSource(database: string, synchronize = false): DataSource {
  return new DataSource({
    type: 'better-sqlite3',
    database,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize,
  });
}

const tempFile = (name: string) =>
  join(mkdtempSync(join(tmpdir(), 'db-')), name);

interface MasterRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

// `migrations` (and sqlite_sequence, created by its AUTOINCREMENT key) only exist with migrations.
const schemaOf = (ds: DataSource): Promise<MasterRow[]> =>
  ds.query(
    `SELECT type, name, tbl_name, sql FROM sqlite_master
     WHERE tbl_name NOT IN ('migrations', 'sqlite_sequence') ORDER BY type, name`,
  );

// One row in every table, built from the schema itself (NOT NULL columns get a value of their type).
async function sampleRows(ds: DataSource): Promise<string[]> {
  const inserts: string[] = [];
  for (const name of await tablesOf(ds)) {
    const columns: { name: string; type: string; dflt_value: string | null }[] =
      await ds.query(`PRAGMA table_info("${name}")`);
    const values = columns.map((column) => {
      if (column.type === 'integer' || column.type === 'boolean') return '1';
      if (column.type === 'real') return '1.5';
      if (column.type === 'datetime') return "'2026-01-01 00:00:00'";
      return `'${name}-${column.name}'`;
    });
    inserts.push(
      `INSERT INTO "${name}" (${columns.map((column) => `"${column.name}"`).join(', ')}) VALUES (${values.join(', ')})`,
    );
  }
  return inserts;
}

async function tablesOf(ds: DataSource): Promise<string[]> {
  const rows: { name: string }[] = await ds.query(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('migrations', 'sqlite_sequence') ORDER BY name`,
  );
  return rows.map((row) => row.name);
}

async function dumpRows(ds: DataSource): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const table of await tablesOf(ds)) {
    out[table] = await ds.query(`SELECT * FROM "${table}" ORDER BY 1`);
  }
  return out;
}

describe('database migrations', () => {
  // Any entity change without its migration makes this fail.
  it('produce exactly the schema the entities describe', async () => {
    const ds = dataSource(':memory:');
    await ds.initialize();
    await ds.runMigrations();

    const pending = await ds.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
    await ds.destroy();
  });

  it('create the same sqlite_master as synchronize does (apart from the migrations table)', async () => {
    const synced = dataSource(':memory:', true);
    await synced.initialize();
    const migrated = dataSource(':memory:');
    await migrated.initialize();
    await migrated.runMigrations();

    expect(await schemaOf(migrated)).toEqual(await schemaOf(synced));
    await synced.destroy();
    await migrated.destroy();
  });

  // Production was created by synchronize: true; the first migration must adopt it untouched.
  it('adopt a database created by synchronize without losing data', async () => {
    const file = tempFile('prod.sqlite');
    const legacy = dataSource(file, true);
    await legacy.initialize();
    for (const sql of await sampleRows(legacy)) await legacy.query(sql);
    const rowsBefore = await dumpRows(legacy);
    const schemaBefore = await schemaOf(legacy);
    await legacy.destroy();

    const migrated = dataSource(file);
    await migrated.initialize();
    const applied = await migrated.runMigrations();

    expect(applied.map((migration) => migration.name)).toEqual(
      MIGRATIONS.map((migration) => migration.name),
    );
    expect(await dumpRows(migrated)).toEqual(rowsBefore);
    expect(await schemaOf(migrated)).toEqual(schemaBefore);
    expect(await migrated.query('SELECT name FROM migrations')).toEqual([
      { name: 'InitialSchema1795700000000' },
    ]);
    expect(
      (await migrated.driver.createSchemaBuilder().log()).upQueries,
    ).toEqual([]);
    expect(await migrated.query('PRAGMA integrity_check')).toEqual([
      { integrity_check: 'ok' },
    ]);
    await migrated.destroy();
  });

  // Production's game_sessions was created before characters_visible_to_others and
  // opening_narration_text existed; TypeORM appended them by rebuilding the table, so created_at
  // comes before them: the column order differs from a fresh synchronize.
  it('adopt a game_sessions table whose columns are in the historical order', async () => {
    const file = tempFile('prod.sqlite');
    const legacy = dataSource(file, true);
    await legacy.initialize();
    await legacy.query('DROP TABLE game_sessions');
    await legacy.query(
      `CREATE TABLE "game_sessions" ("id" text PRIMARY KEY NOT NULL, "game_system_id" text NOT NULL, "name" text NOT NULL, "invite_code" text NOT NULL, "status" text NOT NULL, "current_turn_number" integer NOT NULL, "rolling_summary" text NOT NULL, "created_by_user_id" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "characters_visible_to_others" boolean NOT NULL DEFAULT (0), "opening_narration_text" text)`,
    );
    await legacy.query(
      `CREATE UNIQUE INDEX "IDX_fc8db77f31bad6977380b54b51" ON "game_sessions" ("invite_code") `,
    );
    await legacy.query(
      `CREATE INDEX "IDX_f716881996f2c585500ca0cfcd" ON "game_sessions" ("created_by_user_id") `,
    );
    for (const sql of await sampleRows(legacy)) await legacy.query(sql);
    const rowsBefore = await dumpRows(legacy);
    const schemaBefore = await schemaOf(legacy);
    await legacy.destroy();

    const migrated = dataSource(file);
    await migrated.initialize();
    await migrated.runMigrations();

    expect(await dumpRows(migrated)).toEqual(rowsBefore);
    expect(await schemaOf(migrated)).toEqual(schemaBefore);
    expect(
      (await migrated.driver.createSchemaBuilder().log()).upQueries,
    ).toEqual([]);
    await migrated.destroy();
  });

  it('keep the unique indexes and the composite primary key', async () => {
    const ds = dataSource(':memory:');
    await ds.initialize();
    await ds.runMigrations();
    const user = (id: string) =>
      ds.query(
        `INSERT INTO users (id, email, name, avatar_url) VALUES ('${id}', 'a@example.com', 'A', 'u')`,
      );
    await user('u1');
    const player = () =>
      ds.query(
        `INSERT INTO session_players (session_id, user_id, character_id) VALUES ('s1', 'u1', 'c1')`,
      );
    await player();

    await expect(user('u2')).rejects.toThrow(/UNIQUE/);
    await expect(player()).rejects.toThrow(/UNIQUE/);
    await ds.destroy();
  });

  it('make the initial migration a no-op when it runs again', async () => {
    const ds = dataSource(':memory:');
    await ds.initialize();
    await ds.runMigrations();
    const before = await schemaOf(ds);

    const queryRunner = ds.createQueryRunner();
    await new InitialSchema1795700000000().up(queryRunner);
    await queryRunner.release();

    expect(await schemaOf(ds)).toEqual(before);
    await ds.destroy();
  });

  // forFeature() with an entity missing from ENTITIES would fail at boot with "No metadata".
  it('list every @Entity file of the entities folder in ENTITIES', async () => {
    const dir = join(__dirname, 'entities');
    const declared = readdirSync(dir)
      .filter((file) => file.endsWith('.orm-entity.ts'))
      .map(
        (file) =>
          /@Entity\(\{ name: '(\w+)' \}\)/.exec(
            readFileSync(join(dir, file), 'utf8'),
          )?.[1],
      ) as string[];
    const ds = dataSource(':memory:');
    await ds.initialize();

    const byName = (a: string, b: string) => a.localeCompare(b);
    expect(
      ds.entityMetadatas.map((meta) => meta.tableName).sort(byName),
    ).toEqual(declared.sort(byName));
    await ds.destroy();
  });
});
