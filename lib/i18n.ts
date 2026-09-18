import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/constants";
import { defaultLocale, isLocale, translator, type Locale, type Translate } from "@/lib/i18n-core";

export { LOCALES, isLocale, defaultLocale, translator } from "@/lib/i18n-core";
export type { Locale, Translate } from "@/lib/i18n-core";

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : defaultLocale();
}

export async function getT(): Promise<{ t: Translate; locale: Locale }> {
  const locale = await getLocale();
  return { t: translator(locale), locale };
}
