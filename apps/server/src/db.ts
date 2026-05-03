import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { profileSchema, type Profile } from "@finq/shared";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH ?? path.join(dataDir, "profiles.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    uuid       TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

interface Row {
  uuid: string;
  data: string;
  created_at: number;
  updated_at: number;
}

function rowToProfile(row: Row): Profile | null {
  const parsed = profileSchema.safeParse(JSON.parse(row.data));
  if (!parsed.success) {
    console.warn(
      "[db] skipping row with invalid schema:",
      row.uuid,
      parsed.error.issues
    );
    return null;
  }
  return parsed.data;
}

const stmts = {
  list: db.prepare<[], Row>("SELECT * FROM profiles ORDER BY created_at DESC"),
  get: db.prepare<[string], Row>("SELECT * FROM profiles WHERE uuid = ?"),
  insert: db.prepare(
    "INSERT INTO profiles (uuid, data, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ),
  update: db.prepare(
    "UPDATE profiles SET data = ?, updated_at = ? WHERE uuid = ?"
  ),
  delete: db.prepare("DELETE FROM profiles WHERE uuid = ?"),
};

export const profilesRepo = {
  list(): Profile[] {
    return stmts.list
      .all()
      .map(rowToProfile)
      .filter((p): p is Profile => p !== null);
  },

  get(uuid: string): Profile | undefined {
    const row = stmts.get.get(uuid);
    if (!row) return undefined;
    return rowToProfile(row) ?? undefined;
  },

  insert(profile: Profile): Profile {
    const now = Date.now();
    stmts.insert.run(profile.uuid, JSON.stringify(profile), now, now);
    return profile;
  },

  update(profile: Profile): Profile {
    stmts.update.run(JSON.stringify(profile), Date.now(), profile.uuid);
    return profile;
  },

  delete(uuid: string): boolean {
    const result = stmts.delete.run(uuid);
    return result.changes > 0;
  },
};
