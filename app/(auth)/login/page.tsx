import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { APP_NAME } from "@/lib/app";
import { getSession, userCount } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (userCount() === 0) redirect("/setup");
  if (await getSession()) redirect("/");
  const { t } = await getT();
  const params = await searchParams;

  return (
    <div className="card">
      <h1>{APP_NAME}</h1>
      <p className="mt-1 text-sm text-stone-500">{t("app.tagline")}</p>
      <form action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={params.next ?? "/"} />
        <div>
          <label htmlFor="username">{t("login.username")}</label>
          <input id="username" type="text" name="username" autoComplete="username" autoFocus required />
        </div>
        <div>
          <label htmlFor="password">{t("login.password")}</label>
          <input id="password" type="password" name="password" autoComplete="current-password" required />
        </div>
        {params.error === "wrong" ? <p className="text-sm text-rose-700">{t("login.wrong")}</p> : null}
        {params.error === "rate" ? <p className="text-sm text-rose-700">{t("login.rate")}</p> : null}
        <button className="btn btn-primary w-full justify-center">{t("login.submit")}</button>
      </form>
    </div>
  );
}
