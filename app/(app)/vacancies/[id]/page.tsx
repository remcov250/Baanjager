import Link from "next/link";
import { notFound } from "next/navigation";
import { RULE_KINDS } from "@/db/schema";
import { createRuleFromVacancyAction, updateVacancyAction } from "@/app/(app)/vacancies/actions";
import { Field, Select, StatusBadge, VerdictBadge } from "@/components/ui";
import { VacancyForm } from "@/components/vacancy-form";
import { getT } from "@/lib/i18n";
import { rulesForVacancy } from "@/lib/rules";
import { getVacancy } from "@/lib/vacancies";

export default async function VacancyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; rule?: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  const vacancy = Number.isInteger(numericId) ? getVacancy(numericId) : undefined;
  if (!vacancy) notFound();

  const { t } = await getT();
  const flags = await searchParams;
  const rules = rulesForVacancy(vacancy.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-stone-500 hover:text-ink">← {t("common.back")}</Link>
        <h1>
          {vacancy.title} <span className="font-normal text-stone-500">— {vacancy.employer}</span>
        </h1>
        <VerdictBadge verdict={vacancy.verdict} t={t} />
        <StatusBadge status={vacancy.status} t={t} />
        {vacancy.url ? (
          <a href={vacancy.url} target="_blank" rel="noreferrer noopener" className="btn btn-sm">
            {t("common.open")} ↗
          </a>
        ) : null}
      </div>

      {flags.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {flags.rule ? <p className="notice">{t("criteria.ruleAdded")}</p> : null}
      {flags.error ? <p className="notice">{t("common.validationError")}</p> : null}

      <VacancyForm t={t} action={updateVacancyAction} vacancy={vacancy} />

      <section className="card space-y-4">
        <h2>{t("vacancy.rulesFromThis")}</h2>
        {rules.length ? (
          <ul className="space-y-1 text-sm">
            {rules.map((r) => (
              <li key={r.id}>
                <span className="badge bg-stone-100 text-stone-700">{t(`ruleKind.${r.kind}`)}</span>{" "}
                {r.text}
                {r.retiredAt ? <span className="text-stone-400"> ({t("criteria.retired")})</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{t("common.none")}</p>
        )}

        <form action={createRuleFromVacancyAction} className="space-y-3 border-t border-stone-100 pt-4">
          <input type="hidden" name="vacancyId" value={vacancy.id} />
          <h3 className="text-sm font-semibold">{t("vacancy.makeRule")}</h3>
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Field label={t("criteria.kind")}>
              <Select name="kind" defaultValue="knockout" options={RULE_KINDS} t={t} prefix="ruleKind" />
            </Field>
            <Field label={t("criteria.text")}>
              <input type="text" name="text" required maxLength={1000} defaultValue={vacancy.feedbackInsight ?? ""} />
            </Field>
          </div>
          <Field label={t("criteria.rationale")} help={t("criteria.rationaleHelp")}>
            <textarea name="rationale" maxLength={5000} defaultValue={vacancy.verdictReason ?? ""} className="min-h-[4rem]" />
          </Field>
          <button className="btn">{t("criteria.add")}</button>
        </form>
      </section>
    </div>
  );
}
