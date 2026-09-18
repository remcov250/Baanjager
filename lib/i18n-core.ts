import en from "@/messages/en.json";
import nl from "@/messages/nl.json";

// The part of the i18n setup that has no server-only dependency (no
// next/headers), so it's safe to import from a Client Component too — e.g.
// to build a translator from a plain `locale` string prop instead of passing
// a `t` function across the server/client boundary, which Next.js rejects.

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
