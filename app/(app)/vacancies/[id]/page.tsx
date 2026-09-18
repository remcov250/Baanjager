import Link from "next/link";
import { notFound } from "next/navigation";
import { RULE_KINDS, type Status } from "@/db/schema";
import { createRuleFromVacancyAction, updateVacancyAction } from "@/app/(app)/vacancies/actions";
import { Icon } from "@/components/icons";
import { Field, RuleKindBadge, Select, StatusBadge, VerdictBadge, shortDate } from "@/components/ui";
import { VacancyForm } from "@/components/vacancy-form";
import { getT } from "@/lib/i18n";
import { rulesForVacancy } from "@/lib/rules";
import { getVacancy } from "@/lib/vacancies";

// Once a vacancy has been sent off, the button stops being a call to action.
const ALREADY_APPLIED: Status[] = ["applied", "interview", "offer"];
// Not sent yet, and not closed either: this is what "Solliciteren" is for.
const CAN_APPLY: Status[] = ["new", "in_progress", "on_hold"];

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

  const { t, locale } = await getT();
  const flags = await searchParams;
  const rules = rulesForVacancy(vacancy.id);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-1.5 text-[13px] text-muted">
        <Link href="/vacancies" className="hover:text-fg">{t("vacancies.title")}</Link>
        <span>/</span>
        <span className="truncate">{vacancy.employer}</span>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-[22px] leading-tight sm:text-[28px]">
            {vacancy.title}
            <span className="font-medium text-muted"> — {vacancy.employer}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={vacancy.verdict} t={t} />
            <StatusBadge status={vacancy.status} t={t} />
            <span className="text-[13px] text-muted">
              {t(`layer.${vacancy.layer}`)}
              {vacancy.location ? ` · ${vacancy.location}` : ""}
              {vacancy.foundOn ? ` · ${t("vacancy.tlFound").toLowerCase()} ${shortDate(vacancy.foundOn, locale)}` : ""}
              {vacancy.appliedOn ? ` · ${t("vacancy.tlApplied").toLowerCase()} ${shortDate(vacancy.appliedOn, locale)}` : ""}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
          {vacancy.cvResumeId ? (
            vacancy.cvUrl ? (
              <a
                href={vacancy.cvUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="btn"
                title={vacancy.cvLinkedAt ? t("vacancy.cvLinked", { d: shortDate(vacancy.cvLinkedAt, locale) }) : t("vacancy.cvHint")}
              >
                {t("vacancy.cv")}
                <Icon.external className="h-[15px] w-[15px]" />
              </a>
            ) : (
              <span className="btn cursor-default text-muted" title={t("vacancy.cvHint")}>
                {t("vacancy.cvLinked", { d: shortDate(vacancy.cvLinkedAt, locale) })}
              </span>
            )
          ) : null}
          {vacancy.url ? (
            ALREADY_APPLIED.includes(vacancy.status) ? (
              <a href={vacancy.url} target="_blank" rel="noreferrer noopener" className="btn cursor-default text-muted" title={t("vacancy.alreadyAppliedHint")}>
                {t("vacancy.alreadyApplied")}
                <Icon.external className="h-[15px] w-[15px]" />
              </a>
            ) : CAN_APPLY.includes(vacancy.status) ? (
              <a href={vacancy.url} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
                {t("vacancy.apply")}
                <Icon.external className="h-[15px] w-[15px]" />
              </a>
            ) : (
              <a href={vacancy.url} target="_blank" rel="noreferrer noopener" className="btn">
                {t("common.open")}
                <Icon.external className="h-[15px] w-[15px]" />
              </a>
            )
          ) : null}
          <button form="vacancy-form" className="btn btn-primary hidden lg:inline-flex">{t("common.save")}</button>
        </div>
      </header>

      {flags.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {flags.rule ? <p className="notice">{t("criteria.ruleAdded")}</p> : null}
      {flags.error ? <p className="notice">{t("common.validationError")}</p> : null}

      <VacancyForm t={t} locale={locale} action={updateVacancyAction} vacancy={vacancy} />

      <section className="card flex flex-col gap-4 lg:ml-[calc(5/12*100%+0.33rem)]">
        <h2>{t("vacancy.rulesFromThis")}</h2>
        {rules.length ? (
          <ul className="flex flex-col">
            {rules.map((r) => (
              <li key={r.id} className="flex items-start gap-3 border-t border-line-soft py-2.5 first:border-t-0">
                <RuleKindBadge kind={r.kind} t={t} />
                <span className={r.retiredAt ? "text-muted line-through" : ""}>{r.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("common.none")}</p>
        )}

        <form action={createRuleFromVacancyAction} className="flex flex-col gap-3 rounded-lg border border-accent-line bg-accent-tint p-4">
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
          <div>
            <button className="btn">{t("criteria.add")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
