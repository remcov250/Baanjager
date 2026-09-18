import Link from "next/link";
import { RULE_KINDS } from "@/db/schema";
import { createRuleAction, setRuleRetiredAction } from "@/app/(app)/criteria/actions";
import { Icon } from "@/components/icons";
import { Field, RuleKindBadge, Select } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { listRules } from "@/lib/rules";
import { vacancyOptions } from "@/lib/vacancies";

export default async function CriteriaPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string; saved?: string; error?: string }>;
}) {
  const { t } = await getT();
  const params = await searchParams;
  const showRetired = params.retired === "1";
  const rules = listRules(showRetired);
  const options = vacancyOptions();

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h1>{t("criteria.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("criteria.intro")}</p>
      </div>

      {params.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {params.error ? <p className="notice">{t("common.validationError")}</p> : null}

      <details className="fold card py-3" open={Boolean(params.error)}>
        <summary>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Icon.plus className="h-4 w-4" />
          </span>
          <span className="font-semibold">{t("criteria.add")}</span>
          <Icon.chevron className="fold-chevron" />
        </summary>
        <form action={createRuleAction} className="flex flex-col gap-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <Field label={t("criteria.kind")}>
              <Select name="kind" defaultValue="knockout" options={RULE_KINDS} t={t} prefix="ruleKind" />
            </Field>
            <Field label={t("criteria.text")}>
              <input type="text" name="text" required maxLength={1000} />
            </Field>
          </div>
          <Field label={t("criteria.rationale")} help={t("criteria.rationaleHelp")}>
            <textarea name="rationale" maxLength={5000} className="min-h-[4rem]" />
          </Field>
          <Field label={t("criteria.sourceVacancy")}>
            <select name="sourceVacancyId" defaultValue="">
              <option value="">{t("criteria.sourceVacancyNone")}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.employer} — {o.title}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <button className="btn btn-primary">{t("criteria.add")}</button>
          </div>
        </form>
      </details>

      <p className="text-[13px] text-muted">{t("criteria.orderHelp")}</p>

      {RULE_KINDS.map((kind) => {
        const ofKind = rules.filter((r) => r.kind === kind);
        return (
          <section key={kind} className="card py-3">
            <div className="flex items-baseline gap-2 pb-1">
              <h2>{t(`ruleKind.${kind}`)}</h2>
              <span className="text-[13px] text-muted">{ofKind.length}</span>
              <span className="ml-auto hidden text-xs text-muted sm:inline">{t(`ruleKind.${kind}Help`)}</span>
            </div>
            {ofKind.length === 0 ? (
              <p className="py-1 text-sm text-muted">{t("common.none")}</p>
            ) : (
              ofKind.map((r) => (
                <details key={r.id} className={`fold border-t border-line-soft ${r.retiredAt ? "opacity-60" : ""}`}>
                  <summary className="py-1">
                    <span className={`min-w-0 flex-1 truncate text-sm ${r.retiredAt ? "line-through" : ""}`}>{r.text}</span>
                    <Icon.chevron className="fold-chevron" />
                  </summary>
                  <div className="flex flex-col gap-2 pb-3 pl-1 text-sm">
                    <p className="whitespace-pre-line">{r.text}</p>
                    {r.rationale ? <p className="whitespace-pre-line text-muted">{r.rationale}</p> : null}
                    <p className="text-xs text-muted">
                      {t("criteria.sourceVacancy")}:{" "}
                      {r.sourceVacancyId ? (
                        <Link href={`/vacancies/${r.sourceVacancyId}`} className="text-accent hover:text-accent-deep">
                          {r.sourceEmployer} — {r.sourceTitle}
                        </Link>
                      ) : (
                        t("criteria.sourceVacancyNone")
                      )}
                      {r.retiredAt ? ` · ${t("criteria.retired")}` : null}
                    </p>
                    <form action={setRuleRetiredAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="retired" value={r.retiredAt ? "0" : "1"} />
                      <RuleKindBadge kind={r.kind} t={t} />
                      <button className="btn btn-sm ml-auto">{r.retiredAt ? t("common.restore") : t("common.retire")}</button>
                    </form>
                  </div>
                </details>
              ))
            )}
          </section>
        );
      })}

      <p className="text-sm">
        <Link href={showRetired ? "/criteria" : "/criteria?retired=1"} className="text-muted hover:text-fg">
          {showRetired ? t("criteria.hideRetired") : t("criteria.showRetired")}
        </Link>
      </p>
    </div>
  );
}
