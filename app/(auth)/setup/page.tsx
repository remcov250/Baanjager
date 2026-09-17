import { redirect } from "next/navigation";
import { setup } from "@/app/actions";
import { APP_NAME } from "@/lib/app";
import { MIN_PASSWORD_LENGTH, userCount } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (userCount() > 0) redirect("/login");
  const { t } = await getT();
  const { error } = await searchParams;

  return (
    <div className="card">
      <h1>{APP_NAME}</h1>
      <p className="mt-1 text-sm text-stone-500">{t("setup.intro")}</p>
      <form action={setup} className="mt-6 space-y-4">
        <div>
          <label htmlFor="username">{t("setup.username")}</label>
          <input id="username" type="text" name="username" autoComplete="username" autoFocus required />
          <p className="help">{t("setup.usernameHelp")}</p>
        </div>
        <div>
          <label htmlFor="password">{t("setup.password")}</label>
          <input id="password" type="password" name="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
          <p className="help">{t("setup.passwordHelp", { n: MIN_PASSWORD_LENGTH })}</p>
        </div>
        <div>
          <label htmlFor="password_repeat">{t("setup.passwordRepeat")}</label>
          <input id="password_repeat" type="password" name="password_repeat" autoComplete="new-password" required />
        </div>
        {error ? <p className="text-sm text-rose-700">{t(`setup.error.${error}`)}</p> : null}
        <button className="btn btn-primary w-full justify-center">{t("setup.submit")}</button>
      </form>
    </div>
  );
}
