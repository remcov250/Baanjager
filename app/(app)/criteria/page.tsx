import Link from "next/link";
import { RULE_KINDS } from "@/db/schema";
import { createRuleAction, setRuleRetiredAction } from "@/app/(app)/criteria/actions";
import { Field, Select } from "@/components/ui";
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
    <div className="space-y-6">
      <div>
        <h1>{t("criteria.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("criteria.intro")}</p>
      </div>

      {params.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {params.error ? <p className="notice">{t("common.validationError")}</p> : null}

      <section className="card">
        <h2>{t("criteria.order")}</h2>
        <p className="mt-1 text-sm text-muted">{t("criteria.orderHelp")}</p>
      </section>

      {RULE_KINDS.map((kind) => {
        const ofKind = rules.filter((r) => r.kind === kind);
        return (
          <section key={kind} className="card space-y-3">
            <div>
              <h2>{t(`ruleKind.${kind}`)}</h2>
              <p className="text-xs text-muted">{t(`ruleKind.${kind}Help`)}</p>
            </div>
            {ofKind.length === 0 ? (
              <p className="text-sm text-muted-2">{t("common.none")}</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {ofKind.map((r) => (
                  <li key={r.id} className={`flex flex-wrap items-start gap-3 py-2 ${r.retiredAt ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{r.text}</p>
                      {r.rationale ? <p className="mt-0.5 text-xs text-muted">{r.rationale}</p> : null}
                      <p className="mt-0.5 text-xs text-muted-2">
                        {t("criteria.sourceVacancy")}:{" "}
                        {r.sourceVacancyId ? (
                          <Link href={`/vacancies/${r.sourceVacancyId}`} className="hover:underline">
                            {r.sourceEmployer} — {r.sourceTitle}
                          </Link>
                        ) : (
                          t("criteria.sourceVacancyNone")
                        )}
                        {r.retiredAt ? ` · ${t("criteria.retired")}` : null}
                      </p>
                    </div>
                    <form action={setRuleRetiredAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="retired" value={r.retiredAt ? "0" : "1"} />
                      <button className="btn btn-sm">{r.retiredAt ? t("common.restore") : t("common.retire")}</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-sm">
        <Link href={showRetired ? "/criteria" : "/criteria?retired=1"} className="text-muted hover:text-fg">
          {showRetired ? t("criteria.hideRetired") : t("criteria.showRetired")}
        </Link>
      </p>

      <section className="card space-y-3">
        <h2>{t("criteria.add")}</h2>
        <form action={createRuleAction} className="space-y-3">
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
          <button className="btn btn-primary">{t("criteria.add")}</button>
        </form>
      </section>
    </div>
  );
}
