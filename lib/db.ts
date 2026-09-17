import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "@/db/schema";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "baanjager.db");
const migrationsFolder = path.join(process.cwd(), "drizzle");

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Next.js re-evaluates modules per route in dev; keep one connection per process.
const globalForDb = globalThis as unknown as { __baanjagerDb?: Db };

function open(): Db {
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}

export function getDb(): Db {
  if (!globalForDb.__baanjagerDb) {
    globalForDb.__baanjagerDb = open();
  }
  return globalForDb.__baanjagerDb;
}

export { schema };
