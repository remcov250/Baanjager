"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MIN_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  changePassword as changePasswordInDb,
  clearLoginAttempts,
  createSession,
  createUser,
  destroySession,
  findUser,
  hashPassword,
  loginAllowed,
  requireSession,
  userCount,
  verifyPassword,
} from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/constants";
import { isLocale } from "@/lib/i18n";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Only a path on this origin may be the post-login destination. A leading "//"
// is a protocol-relative URL, and browsers read "/\host" the same way, so the
// value is parsed against a fixed origin and rejected if it ends up elsewhere.
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "/");
  if (!next.startsWith("/") || /^\/[\/\\]/.test(next)) return "/";
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }
}

export async function setTheme(formData: FormData) {
  const theme = formData.get("theme");
  if (isTheme(theme)) {
    (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  }
}

export async function setup(formData: FormData) {
  if (userCount() > 0) redirect("/login");
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("password_repeat") ?? "");

  if (!USERNAME_PATTERN.test(username)) redirect("/setup?error=username");
  if (password.length < MIN_PASSWORD_LENGTH) redirect("/setup?error=short");
  if (password !== repeat) redirect("/setup?error=mismatch");

  const user = createUser(username, password);
  await createSession(user.id);
  redirect("/");
}

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const suffix = next !== "/" ? `&next=${encodeURIComponent(next)}` : "";

  if (!(await loginAllowed())) redirect(`/login?error=rate${suffix}`);

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = findUser(username);

  // Verify against a real hash even when the user doesn't exist, so a missing
  // username and a wrong password take the same time.
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH) && Boolean(user);
  if (!user || !ok) redirect(`/login?error=wrong${suffix}`);

  await clearLoginAttempts();
  await createSession(user.id);
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(formData: FormData) {
  const session = await requireSession();
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("new_password") ?? "");
  const repeat = String(formData.get("new_password_repeat") ?? "");

  const user = findUser(session.username);
  if (!user || !verifyPassword(current, user.passwordHash)) {
    redirect("/settings?password=wrong");
  }
  if (password.length < MIN_PASSWORD_LENGTH) redirect("/settings?password=short");
  if (password !== repeat) redirect("/settings?password=mismatch");

  changePasswordInDb(user.id, password);
  await createSession(user.id);
  redirect("/settings?password=changed");
}

// A real scrypt hash of a random value, computed once per process; it only
// exists so the unknown-user path does the same amount of work.
const DUMMY_HASH = hashPassword(randomBytes(32).toString("hex"));
