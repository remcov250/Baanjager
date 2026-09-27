import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Migrations run at startup against whatever database is on the volume, so
// the newest one is exercised two ways: on a database that stopped at the
// previous migration with data in it, and on a fresh install.

const migrationsFolder = path.resolve("drizzle");
const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, "meta/_journal.json"), "utf8"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baanjager-migrate-"));

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function columns(sqlite: InstanceType<typeof Database>, table: string): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

// A copy of the migrations folder that ends at entry `upTo`.
function folderUpTo(upTo: number): string {
  const dir = path.join(tmp, `upto-${upTo}`);
  fs.mkdirSync(path.join(dir, "meta"), { recursive: true });
  const entries = journal.entries.filter((e: { idx: number }) => e.idx <= upTo);
  for (const e of entries) fs.copyFileSync(path.join(migrationsFolder, `${e.tag}.sql`), path.join(dir, `${e.tag}.sql`));
  fs.writeFileSync(path.join(dir, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
  return dir;
}

describe("migrations", () => {
  it("has more than one entry, so the upgrade path is real", () => {
    expect(journal.entries.length).toBeGreaterThanOrEqual(2);
  });

  it("upgrade an existing database in place, keeping its rows", () => {
    const sqlite = new Database(path.join(tmp, "existing.db"));
    const db = drizzle(sqlite);
    
    // Stop before 0003 so both data migrations since then are exercised: 0003
    // rewrites office_days, 0004 adds cover_letter.
    const officeDaysIdx = journal.entries.findIndex((e: { tag: string }) => e.tag.startsWith("0003_"));
    expect(officeDaysIdx).toBeGreaterThan(0);
    migrate(db, { migrationsFolder: folderUpTo(officeDaysIdx - 1) });
    const before = columns(sqlite, "vacancies");
    expect(before).toEqual(expect.arrayContaining(["analysis", "cv_resume_id", "company_summary"]));
    expect(before).not.toContain("cover_letter");

    // Three shapes of office_days that migration 0003 has to tell apart:
    // a 0 nobody chose (an import default), a 0 that means fully remote, and
    // a real number.
    const insert = sqlite.prepare(
      "INSERT INTO vacancies (employer, title, verdict, status, office_days, remote_note) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insert.run("Acme", "Analyst", "possible", "applied", 0, null);
    insert.run("Beta", "Counsel", "match", "new", 0, "Volledig remote");
    insert.run("Counsel", "Planner", "weak", "dropped", 3, "hybride, 3 dagen kantoor");
    insert.run("Delta", "Officer", "weak", "dropped", 0, null);

    migrate(db, { migrationsFolder });
    const after = columns(sqlite, "vacancies");
    // Additive only: every column that was there stays, the letter is new.
    expect(after).toEqual([...before, "cover_letter"]);

    const rows = sqlite
      .prepare("SELECT employer, office_days AS officeDays, status FROM vacancies ORDER BY id")
      .all() as { employer: string; officeDays: number | null; status: string }[];
    expect(rows).toEqual([
      { employer: "Acme", officeDays: null, status: "applied" },
      { employer: "Beta", officeDays: 0, status: "new" },
      { employer: "Counsel", officeDays: 3, status: "dropped" },
      // Dropped rows are cleaned up too: a 0 there was never a choice either.
      { employer: "Delta", officeDays: null, status: "dropped" },
    ]);

    // Existing rows have no letter yet.
    const letters = sqlite.prepare("SELECT cover_letter AS coverLetter FROM vacancies").all() as { coverLetter: string | null }[];
    expect(letters.every((r) => r.coverLetter === null)).toBe(true);

    // Running it again is a no-op.
    migrate(db, { migrationsFolder });
    expect(columns(sqlite, "vacancies")).toEqual(after);
    sqlite.close();
  });

  it("fresh install ends up with the same columns", () => {
    const fresh = new Database(path.join(tmp, "fresh.db"));
    migrate(drizzle(fresh), { migrationsFolder });
    const upgraded = new Database(path.join(tmp, "existing.db"));
    expect(columns(fresh, "vacancies").sort()).toEqual(columns(upgraded, "vacancies").sort());
    fresh.close();
    upgraded.close();
  });
});
