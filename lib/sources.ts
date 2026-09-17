import { asc, eq, sql } from "drizzle-orm";
import { LAYERS, type Layer, type Source } from "@/db/schema";
import { getDb, schema } from "@/lib/db";

const { sources } = schema;

const layerOrder = Object.fromEntries(LAYERS.map((l, i) => [l, i]));

export function listSources(): Source[] {
  return getDb()
    .select()
    .from(sources)
    .orderBy(asc(sources.layer), asc(sources.id))
    .all()
    .sort((a, b) => layerOrder[a.layer] - layerOrder[b.layer] || a.id - b.id);
}

export function createSource(input: {
  layer: Layer;
  label: string;
  url?: string | null;
  note?: string | null;
  cadence?: string | null;
  active?: boolean;
}): Source {
  return getDb().insert(sources).values(input).returning().get();
}

export function setSourceActive(id: number, active: boolean): void {
  getDb()
    .update(sources)
    .set({ active, updatedAt: sql`(datetime('now'))` })
    .where(eq(sources.id, id))
    .run();
}

export function deleteSource(id: number): void {
  getDb().delete(sources).where(eq(sources.id, id)).run();
}
