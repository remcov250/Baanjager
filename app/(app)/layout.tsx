import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { requireSession, userCount } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (userCount() === 0) redirect("/setup");
  const session = await requireSession();
  const { t, locale } = await getT();
  return (
    <>
      <Nav t={t} locale={locale} username={session.username} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
