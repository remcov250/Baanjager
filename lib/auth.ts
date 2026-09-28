import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

// The first account, and only the first: the check and the insert are one
// transaction, so two /setup posts at the same moment can't both get through.
// Returns undefined when an account already exists.
export function createFirstUser(username: string, password: string) {
  const passwordHash = hashPassword(password);
  const db = getDb();
  return db.transaction(() => {
    const row = db.select({ n: sql<number>`count(*)` }).from(users).get();
    if ((row?.n ?? 0) > 0) return undefined;
    return db.insert(users).values({ username, passwordHash }).returning().get();
  }, { behavior: "immediate" });
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

// Counted per username and client. A single shared counter let anyone who could
// reach /login keep the owner locked out with ten bad guesses every quarter of
// an hour; now that takes knowing the username, and it only locks that name
// from that client when the proxy says who the client is.
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function loginAllowed(username: string): Promise<boolean> {
  const key = await attemptKey(username);
  const now = Date.now();
  sweep(now);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export async function clearLoginAttempts(username: string): Promise<void> {
  attempts.delete(await attemptKey(username));
}

async function attemptKey(username: string): Promise<string> {
  return `${await clientKey()}|${username.slice(0, 64)}`;
}

// Expired entries go; if the map still grows past the cap (many made-up
// usernames or addresses), the oldest go first. Map keeps insertion order.
function sweep(now: number): void {
  for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key);
  for (const key of attempts.keys()) {
    if (attempts.size < MAX_TRACKED) break;
    attempts.delete(key);
  }
}

// Behind a proxy, X-Forwarded-For is "client, proxy1, proxy2…" and a client can
// put anything at the front. The entry the nearest proxy appended — the last
// one — is the only one it vouches for.
async function clientKey(): Promise<string> {
  if (process.env.TRUST_PROXY !== "true") return "direct";
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",").at(-1)?.trim() || "direct";
}

// ------------------------------------------------------------------ API token

function bearerEquals(header: string | null, token: string | undefined): boolean {
  if (!token || !header?.startsWith("Bearer ")) return false;
  // Compare digests: equal length always, so the time taken says nothing about
  // how long the real token is.
  const given = createHash("sha256").update(header.slice("Bearer ".length).trim()).digest();
  const expected = createHash("sha256").update(token).digest();
  return timingSafeEqual(given, expected);
}

export function apiTokenMatches(header: string | null): boolean {
  return bearerEquals(header, process.env.API_TOKEN);
}

// Two tokens: API_TOKEN can do everything, API_TOKEN_READONLY (optional) only
// reads. The full token is checked first, so setting both to the same value
// can never downgrade it.
export type ApiAccess = "full" | "readonly";

export function apiAccess(header: string | null): ApiAccess | null {
  if (bearerEquals(header, process.env.API_TOKEN)) return "full";
  if (bearerEquals(header, process.env.API_TOKEN_READONLY)) return "readonly";
  return null;
}
