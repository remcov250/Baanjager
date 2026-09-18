import Link from "next/link";
import { ANALYSIS_GROUPS, CONTRACT_TYPES, FEEDBACK, LAYERS, STATUSES, VERDICTS, type Analysis, type Vacancy } from "@/db/schema";
import { Icon } from "@/components/icons";
import { Field, Select, shortDate } from "@/components/ui";
import { officeDaysLabel } from "@/lib/office-days";
import type { Locale, Translate } from "@/lib/i18n";

type Props = {
  t: Translate;
  locale: Locale;
  action: (formData: FormData) => Promise<void>;
  vacancy?: Vacancy;
};

// relative keeps the sr-only radio inside the chip instead of at the document edge.
const segment =
  "chip relative cursor-pointer rounded-lg! has-checked:border-fg has-checked:bg-fg has-checked:text-bg";

// A collapsible card: the summary line is what you see on a phone until you open it.
function Fold({
  title,
  summary,
  open,
  children,
  className = "",
}: {
  title: string;
  summary?: string;
  open?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={`fold card py-3 ${className}`} open={open}>
      <summary>
        <span className="flex min-w-0 flex-col">
          <h2>{title}</h2>
          {summary ? <span className="truncate text-[13px] text-muted">{summary}</span> : null}
        </span>
        <Icon.chevron className="fold-chevron" />
      </summary>
      <div className="flex flex-col gap-4 pt-3">{children}</div>
    </details>
  );
}

const groupTone: Record<(typeof ANALYSIS_GROUPS)[number], string> = {
  strong: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  related: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  unknown: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  gaps: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

// Read-only: the assistant writes the evidence over the API, the person edits
// the prose. Empty groups are skipped so a thin analysis stays short.
function AnalysisView({ analysis, t }: { analysis: Analysis; t: Translate }) {
  const groups = ANALYSIS_GROUPS.filter((g) => analysis[g]?.length);
  if (!groups.length && !analysis.terms?.length) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="analysis">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-fg/80">{t("vacancy.analysis")}</span>
        <span className="help">{t("vacancy.analysisHelp")}</span>
      </div>
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-1.5">
          <span className={`badge self-start ${groupTone[group]}`}>{t(`analysis.${group}`)}</span>
          <ul className="flex flex-col gap-1 text-sm">
            {analysis[group].map((item, i) => (
              <li key={i} className="flex flex-col leading-snug sm:flex-row sm:gap-2">
                <span className="font-medium">{item.requirement}</span>
                {item.evidence ? <span className="text-muted">{item.evidence}</span> : null}
                {item.note ? <span className="text-muted-2 text-[13px]">({item.note})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {analysis.terms?.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">{t("analysis.terms")}</span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.terms.map((term) => (
              <span key={term} className="chip py-0.5 text-[13px]">{term}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VacancyForm({ t, locale, action, vacancy }: Props) {
  const v = vacancy;
  const isNew = !v;
  const today = new Date().toISOString().slice(0, 10);

  const conditionsSummary = v
    ? [
        `${t(`layer.${v.layer}`)}${v.location ? ` · ${v.location}` : ""}`,
        v.hours ? `${v.hours} ${t("common.hoursShort")}` : null,
        officeDaysLabel(v.officeDays, v.remoteNote, t),
        v.contractType !== "unknown" ? t(`contract.${v.contractType}`).toLowerCase() : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const basicsSummary = v
    ? [v.source, v.foundOn ? `${t("vacancy.tlFound").toLowerCase()} ${shortDate(v.foundOn, locale)}` : null]
        .filter(Boolean)
        .join(" · ") || undefined
    : undefined;

  const textSummary = v?.vacancyText ? v.vacancyText.replace(/\s+/g, " ").slice(0, 90) : t("vacancy.textEmpty");
  const feedbackSummary = v?.feedbackCorrect
    ? `${t("vacancy.feedbackCorrect")}: ${t(`feedback.${v.feedbackCorrect}`)}`
    : t("vacancy.feedbackEmpty");

  const timeline = v
    ? [
        v.foundOn && { label: t("vacancy.tlFound"), date: v.foundOn, note: v.source ?? undefined },
        v.assessedOn && { label: `${t("vacancy.tlAssessed")}: ${t(`verdict.${v.verdict}`)}`, date: v.assessedOn },
        v.appliedOn && { label: t("vacancy.tlApplied"), date: v.appliedOn },
        v.closedOn && { label: t("vacancy.tlClosed"), date: v.closedOn },
      ].filter((x): x is { label: string; date: string; note?: string } => Boolean(x))
    : [];

  return (
    <form id="vacancy-form" action={action} className="grid gap-4 lg:grid-cols-[5fr_7fr] lg:items-start">
      {v ? <input type="hidden" name="id" value={v.id} /> : null}

      {/* Above both columns, on a phone and on desktop: the one thing worth seeing before the judgement. */}
      <div className="card lg:col-span-2">
        <Field label={t("vacancy.companySummary")} help={t("vacancy.companySummaryHelp")}>
          <textarea name="companySummary" defaultValue={v?.companySummary ?? ""} maxLength={2000} className="min-h-[3rem]" />
        </Field>
      </div>

      {/* Left on desktop, second on a phone: the facts */}
      <div className="order-2 flex flex-col gap-4 lg:order-1">
        <Fold title={t("vacancy.basics")} summary={basicsSummary} open={isNew}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("vacancy.employer")}>
              <input type="text" name="employer" defaultValue={v?.employer ?? ""} required maxLength={200} autoFocus={isNew} />
            </Field>
            <Field label={t("vacancy.title")}>
              <input type="text" name="title" defaultValue={v?.title ?? ""} required maxLength={300} />
            </Field>
            <Field label={t("vacancy.url")} className="sm:col-span-2">
              <input type="url" name="url" defaultValue={v?.url ?? ""} maxLength={2000} />
            </Field>
            <Field label={t("vacancy.source")} help={t("vacancy.sourceHelp")}>
              <input type="text" name="source" defaultValue={v?.source ?? ""} maxLength={200} />
            </Field>
            <div className="flex items-start gap-2.5 sm:pt-6">
              <input type="checkbox" id="sourceVerified" name="sourceVerified" defaultChecked={v?.sourceVerified ?? false} className="mt-1 h-4 w-4 accent-accent" />
              <label htmlFor="sourceVerified" className="font-normal">
                {t("vacancy.sourceVerified")}
                <span className="help">{t("vacancy.sourceVerifiedHelp")}</span>
              </label>
            </div>
            <Field label={t("vacancy.foundOn")}>
              <input type="date" name="foundOn" defaultValue={v?.foundOn ?? today} />
            </Field>
            <Field label={t("vacancy.assessedOn")}>
              <input type="date" name="assessedOn" defaultValue={v?.assessedOn ?? ""} />
            </Field>
          </div>
        </Fold>

        <Fold title={t("vacancy.conditions")} summary={conditionsSummary} open={isNew}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("vacancy.layer")} help={t("layer.help")}>
              <Select name="layer" defaultValue={v?.layer ?? "na"} options={LAYERS} t={t} prefix="layer" />
            </Field>
            <Field label={t("vacancy.location")}>
              <input type="text" name="location" defaultValue={v?.location ?? ""} maxLength={200} />
            </Field>
            <Field label={`${t("vacancy.commuteMinutes")} (${t("common.minutes")})`}>
              <input type="number" name="commuteMinutes" min={0} max={1440} defaultValue={v?.commuteMinutes ?? ""} />
            </Field>
            <Field label={t("vacancy.hours")} help={t("vacancy.hoursHelp")}>
              <input type="text" name="hours" defaultValue={v?.hours ?? ""} maxLength={50} />
            </Field>
            <Field label={t("vacancy.contractType")}>
              <Select name="contractType" defaultValue={v?.contractType ?? "unknown"} options={CONTRACT_TYPES} t={t} prefix="contract" />
            </Field>
            <Field label={`${t("vacancy.officeDays")} (${t("common.perWeek")})`}>
              <input type="number" name="officeDays" min={0} max={7} defaultValue={v?.officeDays ?? ""} />
            </Field>
            <Field label={t("vacancy.remoteNote")} help={t("vacancy.remoteNoteHelp")}>
              <input type="text" name="remoteNote" defaultValue={v?.remoteNote ?? ""} maxLength={500} />
            </Field>
            <Field label={t("vacancy.salary")} help={t("vacancy.salaryHelp")}>
              <input type="text" name="salary" defaultValue={v?.salary ?? ""} maxLength={200} />
            </Field>
            <Field label={t("vacancy.languageRequirement")} className="sm:col-span-2">
              <input type="text" name="languageRequirement" defaultValue={v?.languageRequirement ?? ""} maxLength={300} />
            </Field>
          </div>
        </Fold>

        {timeline.length ? (
          <section className="card flex flex-col gap-3 py-4">
            <h2>{t("vacancy.timeline")}</h2>
            <ol className="flex flex-col">
              {timeline.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-fg" />
                    <span className="w-0.5 flex-1 bg-line" />
                  </div>
                  <div className="flex flex-col pb-3">
                    <span className="font-medium">{step.label}</span>
                    <span className="text-[13px] text-muted">
                      {shortDate(step.date, locale)}
                      {step.note ? ` · ${step.note}` : ""}
                    </span>
                  </div>
                </li>
              ))}
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-surface" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-accent">{t(`status.${v!.status}`)}</span>
                  {v!.statusNote ? <span className="line-clamp-2 text-[13px] text-muted">{v!.statusNote}</span> : null}
                </div>
              </li>
            </ol>
          </section>
        ) : null}

        <Fold title={t("vacancy.text")} summary={textSummary}>
          <Field label="" help={t("vacancy.vacancyTextHelp")}>
            <textarea name="vacancyText" aria-label={t("vacancy.text")} defaultValue={v?.vacancyText ?? ""} maxLength={100000} className="min-h-[12rem] font-mono text-base sm:text-[13px]" />
          </Field>
        </Fold>
      </div>

      {/* Right on desktop, first on a phone: the judgement is what you open it for */}
      <div className="order-1 flex flex-col gap-4 lg:order-2">
        <section className="card flex flex-col gap-4 border-accent-line">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-center gap-3">
              <h2>{t("vacancy.assessment")}</h2>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {VERDICTS.map((option) => (
                <label key={option} className={segment}>
                  <input type="radio" name="verdict" value={option} defaultChecked={(v?.verdict ?? "pending") === option} className="sr-only" />
                  {t(`verdict.${option}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {v?.analysis ? <AnalysisView analysis={v.analysis} t={t} /> : null}
          <Field label={t("vacancy.verdictReason")} help={t("vacancy.verdictReasonHelp")} helpAlways>
            <textarea name="verdictReason" defaultValue={v?.verdictReason ?? ""} maxLength={5000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("vacancy.fits")}>
              <textarea name="fits" defaultValue={v?.fits ?? ""} maxLength={5000} className="min-h-[4.5rem]" />
            </Field>
            <Field label={t("vacancy.fitsNot")}>
              <textarea name="fitsNot" defaultValue={v?.fitsNot ?? ""} maxLength={5000} className="min-h-[4.5rem]" />
            </Field>
          </div>
          <Field label={t("vacancy.doubts")} help={t("vacancy.doubtsHelp")}>
            <textarea name="doubts" defaultValue={v?.doubts ?? ""} maxLength={5000} className="min-h-[4rem]" />
          </Field>
        </section>

        <section className="card flex flex-col gap-4">
          <h2>{t("vacancy.progress")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("vacancy.status")}>
              <Select name="status" defaultValue={v?.status ?? "new"} options={STATUSES} t={t} prefix="status" />
            </Field>
            <Field label={t("vacancy.appliedOn")}>
              <input type="date" name="appliedOn" defaultValue={v?.appliedOn ?? ""} />
            </Field>
            <Field label={t("vacancy.closedOn")}>
              <input type="date" name="closedOn" defaultValue={v?.closedOn ?? ""} />
            </Field>
          </div>
          <Field label={t("vacancy.statusNote")} help={t("vacancy.statusNoteHelp")}>
            <textarea name="statusNote" defaultValue={v?.statusNote ?? ""} maxLength={5000} className="min-h-[4.5rem]" />
          </Field>
          <p className="text-xs text-muted">{t("vacancy.neverDeleted")}</p>
        </section>

        <Fold title={t("vacancy.feedback")} summary={feedbackSummary} open={Boolean(v?.feedbackCorrect)}>
          <p className="text-[13px] text-muted">{t("vacancy.feedbackIntro")}</p>
          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="sr-only">{t("vacancy.feedbackCorrect")}</legend>
            <span className="text-sm font-medium text-fg/80">{t("vacancy.feedbackCorrect")}</span>
            <div className="flex gap-1.5">
              <label className={segment}>
                <input type="radio" name="feedbackCorrect" value="" defaultChecked={!v?.feedbackCorrect} className="sr-only" />
                {t("common.none")}
              </label>
              {FEEDBACK.map((f) => (
                <label key={f} className={segment}>
                  <input type="radio" name="feedbackCorrect" value={f} defaultChecked={v?.feedbackCorrect === f} className="sr-only" />
                  {t(`feedback.${f}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t("vacancy.feedbackMissed")}>
            <textarea name="feedbackMissed" defaultValue={v?.feedbackMissed ?? ""} maxLength={5000} className="min-h-[4rem]" />
          </Field>
          <Field label={t("vacancy.feedbackInsight")} help={t("vacancy.feedbackInsightHelp")}>
            <textarea name="feedbackInsight" defaultValue={v?.feedbackInsight ?? ""} maxLength={5000} className="min-h-[4rem]" />
          </Field>
        </Fold>

        <div className="flex items-center gap-3 lg:hidden">
          <button className="btn btn-primary">{t("common.save")}</button>
          <Link href={v ? `/vacancies/${v.id}` : "/vacancies"} className="btn">
            {t("common.cancel")}
          </Link>
        </div>
      </div>
    </form>
  );
}
