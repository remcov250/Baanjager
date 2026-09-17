import Link from "next/link";
import { logout, setLocale } from "@/app/actions";
import { APP_NAME } from "@/lib/app";
import { LOCALES, type Locale, type Translate } from "@/lib/i18n";

const links = [
  ["/", "nav.vacancies"],
  ["/criteria", "nav.criteria"],
  ["/profile", "nav.profile"],
  ["/sources", "nav.sources"],
  ["/settings", "nav.settings"],
] as const;

// Phone: brand row on top, a horizontally scrollable link row underneath so
// nothing wraps into a two-line mess. Tablet and up: one row.
export function Nav({ t, locale, username }: { t: Translate; locale: Locale; username: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-4 py-2.5 sm:py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-accent">
            {APP_NAME}
          </Link>
          <nav className="hidden gap-4 text-sm sm:flex">
            {links.map(([href, key]) => (
              <Link key={href} href={href} className="text-stone-700 hover:text-ink">
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-stone-500">
            <form action={setLocale} className="flex gap-1">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  name="locale"
                  value={code}
                  className={`px-1 py-1 ${code === locale ? "font-semibold text-ink" : "hover:text-ink"}`}
                  aria-label={`${t("nav.language")}: ${code}`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </form>
            <span className="hidden md:inline">{username}</span>
            <form action={logout}>
              <button className="px-1 py-1 hover:text-ink">{t("nav.logout")}</button>
            </form>
          </div>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm sm:hidden">
          {links.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-full border border-stone-200 px-3 py-1 text-stone-700 active:bg-stone-100"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
