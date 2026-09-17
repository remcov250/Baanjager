import { redirect } from "next/navigation";
import { MobileBar, Sidebar, TabBar } from "@/components/shell";
import { requireSession, userCount } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (userCount() === 0) redirect("/setup");
  const session = await requireSession();
  const { t, locale } = await getT();
  const theme = await getTheme();
  return (
    <div className="min-h-screen md:flex">
      <Sidebar t={t} locale={locale} theme={theme} username={session.username} />
      <div className="min-w-0 flex-1">
        <MobileBar t={t} locale={locale} />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-8 sm:pt-7 md:pb-12">{children}</main>
        <TabBar t={t} />
      </div>
    </div>
  );
}
