import { headers } from "next/headers";
import { AiGuide } from "@/content/ai-guide";
import { getT } from "@/lib/i18n";

export default async function AiPage() {
  const { t, locale } = await getT();
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const apiEnabled = Boolean(process.env.API_TOKEN);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h1>{t("nav.ai")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("ai.intro")}</p>
      </div>
      {!apiEnabled ? <p className="notice">{t("settings.apiDisabled")}</p> : null}
      <AiGuide locale={locale} origin={origin} />
    </div>
  );
}
