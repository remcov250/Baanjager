import Link from "next/link";
import { createVacancyAction } from "@/app/(app)/vacancies/actions";
import { VacancyForm } from "@/components/vacancy-form";
import { getT } from "@/lib/i18n";

export default async function NewVacancyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { t, locale } = await getT();
  const { error } = await searchParams;
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        <Link href="/vacancies" className="hover:text-fg">{t("vacancies.title")}</Link>
        <span>/</span>
        <span>{t("vacancies.new")}</span>
      </div>
      <header className="flex items-center gap-4">
        <h1>{t("vacancies.new")}</h1>
        <button form="vacancy-form" className="btn btn-primary ml-auto hidden lg:inline-flex">{t("common.save")}</button>
      </header>
      {error ? <p className="notice">{t("common.validationError")}</p> : null}
      <VacancyForm t={t} locale={locale} action={createVacancyAction} />
    </div>
  );
}
