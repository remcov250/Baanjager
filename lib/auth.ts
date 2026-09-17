import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, lt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/constants";

const { users, sessions } = schema;

const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const MIN_PASSWORD_LENGTH = 10;

// ------------------------------------------------------------------ passwords

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, SCRYPT);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------- users

export function userCount(): number {
  const row = getDb().select({ n: sql<number>`count(*)` }).from(users).get();
  return row?.n ?? 0;
}

export function findUser(username: string) {
  return getDb().select().from(users).where(eq(users.username, username)).get();
}

export function createUser(username: string, password: string) {
  return getDb()
    .insert(users)
    .values({ username, passwordHash: hashPassword(password) })
    .returning()
    .get();
}

export function changePassword(userId: number, newPassword: string): void {
  const db = getDb();
  db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, userId)).run();
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

// ------------------------------------------------------------------- sessions

async function cookieOptions() {
  // Behind a reverse proxy the request itself is plain HTTP; trust the proxy's
  // word for it so the cookie still gets the Secure flag on real HTTPS setups.
  const proto = (await headers()).get("x-forwarded-proto");
  const secure = process.env.COOKIE_SECURE === "true" || proto === "https";
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  };
}

export async function createSession(userId: number): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  const db = getDb();
  db.insert(sessions).values({ id, userId, expiresAt }).run();
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
  (await cookies()).set(SESSION_COOKIE, id, await cookieOptions());
}

export type SessionInfo = { userId: number; username: string; sessionId: string };

export async function getSession(): Promise<SessionInfo | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = getDb()
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;
  if (row.expiresAt < new Date().toISOString()) {
    getDb().delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return { userId: row.userId, username: row.username, sessionId: row.sessionId };
}

export async function requireSession(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) getDb().delete(sessions).where(eq(sessions.id, id)).run();
  store.delete(SESSION_COOKIE);
}

// --------------------------------------------------------------- rate limiting

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function loginAllowed(): Promise<boolean> {
  const key = await clientKey();
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export async function clearLoginAttempts(): Promise<void> {
  attempts.delete(await clientKey());
}

async function clientKey(): Promise<string> {
  if (process.env.TRUST_PROXY !== "true") return "global";
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "global";
}

// ------------------------------------------------------------------ API token

export function apiTokenMatches(header: string | null): boolean {
  const token = process.env.API_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length).trim());
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
