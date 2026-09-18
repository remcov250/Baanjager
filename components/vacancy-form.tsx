import Link from "next/link";
import { CONTRACT_TYPES, FEEDBACK, LAYERS, STATUSES, VERDICTS, type Vacancy } from "@/db/schema";
import { Field, Select, shortDate } from "@/components/ui";
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

export function VacancyForm({ t, locale, action, vacancy }: Props) {
  const v = vacancy;
  const today = new Date().toISOString().slice(0, 10);

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

      {/* Left on desktop, second on a phone: the facts */}
      <div className="order-2 flex flex-col gap-4 lg:order-1">
        <section className="card flex flex-col gap-4">
          <h2>{t("vacancy.basics")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("vacancy.employer")}>
              <input type="text" name="employer" defaultValue={v?.employer ?? ""} required maxLength={200} autoFocus={!v} />
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
        </section>

        <section className="card flex flex-col gap-4">
          <h2>{t("vacancy.conditions")}</h2>
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
        </section>

        {timeline.length ? (
          <section className="card flex flex-col gap-3">
            <h2>{t("vacancy.timeline")}</h2>
            <ol className="flex flex-col">
              {timeline.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-fg" />
                    <span className="w-0.5 flex-1 bg-line" />
                  </div>
                  <div className="flex flex-col pb-3.5">
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
                  {v!.statusNote ? (
                    <span className="line-clamp-2 text-[13px] text-muted">{v!.statusNote}</span>
                  ) : null}
                </div>
              </li>
            </ol>
          </section>
        ) : null}

        <section className="card flex flex-col gap-2">
          <h2>{t("vacancy.text")}</h2>
          <Field label="" help={t("vacancy.vacancyTextHelp")}>
            <textarea name="vacancyText" aria-label={t("vacancy.text")} defaultValue={v?.vacancyText ?? ""} maxLength={100000} className="min-h-[12rem] font-mono text-base sm:text-[13px]" />
          </Field>
        </section>
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
          <Field label={t("vacancy.verdictReason")} help={t("vacancy.verdictReasonHelp")}>
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

        <section className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2>{t("vacancy.feedback")}</h2>
            <p className="text-[13px] text-muted">{t("vacancy.feedbackIntro")}</p>
          </div>
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
        </section>

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
