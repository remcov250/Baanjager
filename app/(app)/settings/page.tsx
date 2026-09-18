import Link from "next/link";
import { changePassword } from "@/app/actions";
import { importCsvAction } from "@/app/(app)/settings/actions";
import { Field } from "@/components/ui";
import { ThemeSwitch } from "@/components/shell";
import { MIN_PASSWORD_LENGTH, requireSession } from "@/lib/auth";
import { getTheme } from "@/lib/theme";
import { getT } from "@/lib/i18n";

const PASSWORD_MESSAGES = ["changed", "wrong", "short", "mismatch"] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string; added?: string; skipped?: string; password?: string }>;
}) {
  const session = await requireSession();
  const { t } = await getT();
  const params = await searchParams;
  const apiEnabled = Boolean(process.env.API_TOKEN);
  const theme = await getTheme();

  // A plain object lookup would also hit inherited names ("constructor",
  // "__proto__") and try to render them; only the known codes get a message.
  const passwordCode = PASSWORD_MESSAGES.find((code) => code === params.password);
  const passwordMessage = passwordCode
    ? {
        changed: t("settings.passwordChanged"),
        wrong: t("settings.passwordWrong"),
        short: t("settings.passwordShort"),
        mismatch: t("settings.passwordMismatch"),
      }[passwordCode]
    : undefined;

  return (
    <div className="space-y-6">
      <h1>{t("settings.title")}</h1>

      {/* The phone tab bar has no room for Bronnen; this is its way in. */}
      <section className="card space-y-3 md:hidden">
        <h2>{t("nav.sources")}</h2>
        <p className="text-sm text-muted">{t("sources.intro")}</p>
        <Link href="/sources" className="btn">
          {t("nav.sources")}
        </Link>
      </section>

      <section className="card space-y-3">
        <h2>{t("settings.appearance")}</h2>
        <ThemeSwitch t={t} theme={theme} />
      </section>

      <section className="card space-y-3">
        <h2>{t("nav.ai")}</h2>
        <p className="text-sm text-muted">{t("settings.aiCard")}</p>
        <Link href="/ai" className="btn">{t("nav.ai")}</Link>
      </section>

      <section className="card space-y-3">
        <h2>{t("settings.import")}</h2>
        <p className="text-sm text-muted">{t("settings.importHelp")}</p>
        <p className="text-xs text-muted">{t("settings.importLegacyHelp")}</p>
        {params.import === "done" ? (
          <p className="notice">
            {t("settings.importResult", { added: params.added ?? "0", skipped: params.skipped ?? "0" })}
          </p>
        ) : null}
        {params.import === "empty" || params.import === "toolarge" ? (
          <p className="notice">{t(`settings.import_${params.import}`)}</p>
        ) : null}
        <form action={importCsvAction} className="flex flex-wrap items-end gap-3">
          <Field label={t("settings.file")} className="min-w-[16rem]">
            <input type="file" name="file" accept=".csv,text/csv" required />
          </Field>
          <button className="btn btn-primary">{t("settings.importButton")}</button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2>{t("settings.export")}</h2>
        <p className="text-sm text-muted">{t("settings.exportHelp")}</p>
        <a href="/settings/export" className="btn">
          {t("settings.exportButton")}
        </a>
      </section>

      <section className="card space-y-3">
        <h2>{t("settings.api")}</h2>
        <p className={`text-sm ${apiEnabled ? "text-green-800 dark:text-green-300" : "text-muted"}`}>
          {apiEnabled ? t("settings.apiEnabled") : t("settings.apiDisabled")}
        </p>
        <p className="text-xs text-muted">{t("settings.apiHelp")}</p>
      </section>

      <section className="card space-y-3">
        <h2>{t("settings.account")}</h2>
        <p className="text-sm text-muted">{t("settings.loggedInAs", { name: session.username })}</p>
        {passwordMessage ? <p className="notice">{passwordMessage}</p> : null}
        <form action={changePassword} className="grid max-w-md gap-3">
          <Field label={t("settings.currentPassword")}>
            <input type="password" name="current_password" autoComplete="current-password" required />
          </Field>
          <Field label={t("settings.newPassword")}>
            <input type="password" name="new_password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
          </Field>
          <Field label={t("settings.newPasswordRepeat")}>
            <input type="password" name="new_password_repeat" autoComplete="new-password" required />
          </Field>
          <div>
            <button className="btn">{t("settings.changePassword")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
