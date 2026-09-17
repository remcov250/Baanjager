import Link from "next/link";
import { createVacancyAction } from "@/app/(app)/vacancies/actions";
import { VacancyForm } from "@/components/vacancy-form";
import { getT } from "@/lib/i18n";

export default async function NewVacancyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { t } = await getT();
  const { error } = await searchParams;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-stone-500 hover:text-ink">← {t("common.back")}</Link>
        <h1>{t("vacancies.new")}</h1>
      </div>
      {error ? <p className="notice">{t("common.validationError")}</p> : null}
      <VacancyForm t={t} action={createVacancyAction} />
    </div>
  );
}
