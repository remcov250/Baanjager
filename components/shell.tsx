import Link from "next/link";
import { logout, setLocale, setTheme } from "@/app/actions";
import { Icon } from "@/components/icons";
import { SidebarLinks, TabLinks, type NavItem } from "@/components/nav-links";
import { APP_NAME } from "@/lib/app";
import { LOCALES, type Locale, type Translate } from "@/lib/i18n";
import { THEMES, type Theme } from "@/lib/theme";

function navItems(t: Translate): NavItem[] {
  return [
    { href: "/", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/vacancies", label: t("nav.vacancies"), icon: "vacancies" },
    { href: "/criteria", label: t("nav.criteria"), icon: "criteria" },
    { href: "/profile", label: t("nav.profile"), icon: "profile" },
    { href: "/sources", label: t("nav.sources"), icon: "sources" },
    { href: "/settings", label: t("nav.settings"), icon: "settings" },
  ];
}

function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : "h-[30px] w-[30px] rounded-lg";
  const text = size === "sm" ? "text-[19px]" : "text-xl";
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={`flex items-center justify-center bg-accent text-white ${box}`}>
        <Icon.mark className="h-[17px] w-[17px]" />
      </span>
      <span className={`font-display font-bold tracking-tight text-fg ${text}`}>{APP_NAME}</span>
    </Link>
  );
}

export function ThemeSwitch({ t, theme, full = false }: { t: Translate; theme: Theme; full?: boolean }) {
  return (
    <form action={setTheme} className={`${full ? "flex" : "inline-flex"} overflow-hidden rounded-lg border border-line text-xs`}>
      {THEMES.map((option) => (
        <button
          key={option}
          name="theme"
          value={option}
          className={`px-2.5 py-1.5 ${full ? "flex-1" : ""} ${option === theme ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          aria-pressed={option === theme}
        >
          {t(`theme.${option}`)}
        </button>
      ))}
    </form>
  );
}

function LocaleSwitch({ t, locale }: { t: Translate; locale: Locale }) {
  return (
    <form action={setLocale} className="flex gap-1 text-xs">
      {LOCALES.map((code) => (
        <button
          key={code}
          name="locale"
          value={code}
          className={`px-1 py-1 ${code === locale ? "font-semibold text-fg" : "text-muted hover:text-fg"}`}
          aria-label={`${t("nav.language")}: ${code}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </form>
  );
}

export function Sidebar({
  t,
  locale,
  theme,
  username,
}: {
  t: Translate;
  locale: Locale;
  theme: Theme;
  username: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
      <div className="px-3 pb-6 pt-1">
        <Brand />
      </div>
      <SidebarLinks items={navItems(t)} />
      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 px-1">
          <ThemeSwitch t={t} theme={theme} full />
          <div className="flex justify-end">
            <LocaleSwitch t={t} locale={locale} />
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fg text-[13px] font-semibold uppercase text-bg">
            {username.slice(0, 1)}
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-semibold">{username}</span>
            <form action={logout}>
              <button className="text-xs text-muted hover:text-fg">{t("nav.logout")}</button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileBar({ t, locale }: { t: Translate; locale: Locale }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Brand size="sm" />
      <div className="ml-auto flex items-center gap-2">
        <LocaleSwitch t={t} locale={locale} />
        <form action={logout}>
          <button className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-fg" aria-label={t("nav.logout")}>
            <Icon.logout className="h-[22px] w-[22px]" />
          </button>
        </form>
      </div>
    </header>
  );
}

export function TabBar({ t }: { t: Translate }) {
  // Five tabs fit a phone; Bronnen lives under Instellingen's neighbour "Meer".
  const items = navItems(t).filter((i) => i.href !== "/sources" && i.href !== "/settings");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5 md:hidden">
      <TabLinks items={items} />
      <Link href="/settings" className="tab">
        <Icon.more className="h-[22px] w-[22px]" />
        {t("nav.more")}
      </Link>
    </nav>
  );
}
