import { cookies } from "next/headers";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";

export const LOCALES = ["nl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

type Dict = typeof nl;

const dicts: Record<Locale, Dict> = { nl, en };

export function isLocale(value: unknown): value is Locale {
  return value === "nl" || value === "en";
}

export function defaultLocale(): Locale {
  const env = process.env.DEFAULT_LOCALE;
  return isLocale(env) ? env : "nl";
}

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get("locale")?.value;
  return isLocale(fromCookie) ? fromCookie : defaultLocale();
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function translator(locale: Locale): Translate {
  const dict = dicts[locale] as unknown as Record<string, unknown>;
  return (key, vars) => {
    const value = key.split(".").reduce<unknown>((node, part) => {
      if (node && typeof node === "object" && part in node) {
        return (node as Record<string, unknown>)[part];
      }
      return undefined;
    }, dict);
    if (typeof value !== "string") return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, name) =>
      name in vars ? String(vars[name]) : `{${name}}`,
    );
  };
}

export async function getT(): Promise<{ t: Translate; locale: Locale }> {
  const locale = await getLocale();
  return { t: translator(locale), locale };
}
