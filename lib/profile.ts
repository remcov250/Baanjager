import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PROFILE_KEYS, type ProfileKey } from "@/lib/validation";

const { profileSections, settings } = schema;

export function getProfile(): Record<ProfileKey, string> {
  const rows = getDb().select().from(profileSections).all();
  const out = Object.fromEntries(PROFILE_KEYS.map((k) => [k, ""])) as Record<ProfileKey, string>;
  for (const row of rows) {
    if ((PROFILE_KEYS as readonly string[]).includes(row.key)) {
      out[row.key as ProfileKey] = row.content;
    }
  }
  return out;
}

export function setProfileSection(key: ProfileKey, content: string): void {
  getDb()
    .insert(profileSections)
    .values({ key, content })
    .onConflictDoUpdate({
      target: profileSections.key,
      set: { content, updatedAt: sql`(datetime('now'))` },
    })
    .run();
}

export function getSetting(key: string): string {
  return getDb().select().from(settings).where(eq(settings.key, key)).get()?.value ?? "";
}

export function setSetting(key: string, value: string): void {
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}
