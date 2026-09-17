"use server";

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
  loginAllowed,
  requireSession,
  userCount,
  verifyPassword,
} from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/constants";
import { isLocale } from "@/lib/i18n";

const ONE_YEAR = 60 * 60 * 24 * 365;

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
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
  const ok = user
    ? verifyPassword(password, user.passwordHash)
    : verifyPassword(password, DUMMY_HASH) && false;
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

// A valid scrypt hash of a random string; only its shape matters.
const DUMMY_HASH =
  "scrypt$5f3a9c1e7b2d4a6c8e0f1a3b5c7d9e1f$" +
  "b1c4e7a2d5f8093c6b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b5e8a1d4c7f0b3e6a9d2c5f8b1e4a7d0c3f6b9e2a5d8c1f4b7e0a3d6c9f2b5e8a1d4c7f0b3e6";
