import { saveProfileAction } from "@/app/(app)/profile/actions";
import { Field } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { getProfile, getSetting } from "@/lib/profile";
import { PROFILE_KEYS } from "@/lib/validation";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { t } = await getT();
  const { saved } = await searchParams;
  const profile = getProfile();
  const homeBase = getSetting("home_base");

  return (
    <div className="space-y-6">
      <div>
        <h1>{t("profile.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">{t("profile.intro")}</p>
      </div>

      <p className="notice">🔒 {t("profile.privacy")}</p>
      {saved ? <p className="notice">{t("common.saved")}</p> : null}

      <form action={saveProfileAction} className="space-y-6">
        <section className="card">
          <Field label={t("profile.homeBase")} help={t("profile.homeBaseHelp")} className="max-w-sm">
            <input type="text" name="home_base" defaultValue={homeBase} maxLength={200} />
          </Field>
        </section>

        {PROFILE_KEYS.map((key) => (
          <section key={key} className="card">
            <Field label={t(`profile.${key}`)} help={t(`profile.${key}Help`) === `profile.${key}Help` ? undefined : t(`profile.${key}Help`)}>
              <textarea name={key} defaultValue={profile[key]} maxLength={50000} className="min-h-[10rem]" />
            </Field>
          </section>
        ))}

        <button className="btn btn-primary">{t("common.save")}</button>
      </form>
    </div>
  );
}
