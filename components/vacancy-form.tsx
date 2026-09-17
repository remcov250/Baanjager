import Link from "next/link";
import { CONTRACT_TYPES, FEEDBACK, LAYERS, STATUSES, VERDICTS, type Vacancy } from "@/db/schema";
import { Field, Select } from "@/components/ui";
import type { Translate } from "@/lib/i18n";

type Props = {
  t: Translate;
  action: (formData: FormData) => Promise<void>;
  vacancy?: Vacancy;
};

export function VacancyForm({ t, action, vacancy }: Props) {
  const v = vacancy;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      {v ? <input type="hidden" name="id" value={v.id} /> : null}

      <section className="card space-y-4">
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
          <div className="flex items-start gap-2 pt-6">
            <input type="checkbox" id="sourceVerified" name="sourceVerified" defaultChecked={v?.sourceVerified ?? false} className="mt-1" />
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

      <section className="card space-y-4">
        <h2>{t("vacancy.conditions")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Field label={t("vacancy.languageRequirement")}>
            <input type="text" name="languageRequirement" defaultValue={v?.languageRequirement ?? ""} maxLength={300} />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 border-accent/40">
        <h2>{t("vacancy.assessment")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("vacancy.verdict")}>
            <Select name="verdict" defaultValue={v?.verdict ?? "pending"} options={VERDICTS} t={t} prefix="verdict" />
          </Field>
        </div>
        <Field label={t("vacancy.verdictReason")} help={t("vacancy.verdictReasonHelp")}>
          <textarea name="verdictReason" defaultValue={v?.verdictReason ?? ""} maxLength={5000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("vacancy.fits")}>
            <textarea name="fits" defaultValue={v?.fits ?? ""} maxLength={5000} />
          </Field>
          <Field label={t("vacancy.fitsNot")}>
            <textarea name="fitsNot" defaultValue={v?.fitsNot ?? ""} maxLength={5000} />
          </Field>
        </div>
        <Field label={t("vacancy.doubts")} help={t("vacancy.doubtsHelp")}>
          <textarea name="doubts" defaultValue={v?.doubts ?? ""} maxLength={5000} />
        </Field>
      </section>

      <section className="card space-y-4">
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
          <textarea name="statusNote" defaultValue={v?.statusNote ?? ""} maxLength={5000} />
        </Field>
        <p className="notice">{t("vacancy.neverDeleted")}</p>
      </section>

      <section className="card space-y-4">
        <h2>{t("vacancy.feedback")}</h2>
        <p className="text-sm text-stone-600">{t("vacancy.feedbackIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("vacancy.feedbackCorrect")}>
            <select name="feedbackCorrect" defaultValue={v?.feedbackCorrect ?? ""}>
              <option value="">{t("common.none")}</option>
              {FEEDBACK.map((f) => (
                <option key={f} value={f}>
                  {t(`feedback.${f}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("vacancy.feedbackMissed")}>
          <textarea name="feedbackMissed" defaultValue={v?.feedbackMissed ?? ""} maxLength={5000} />
        </Field>
        <Field label={t("vacancy.feedbackInsight")} help={t("vacancy.feedbackInsightHelp")}>
          <textarea name="feedbackInsight" defaultValue={v?.feedbackInsight ?? ""} maxLength={5000} />
        </Field>
      </section>

      <section className="card space-y-4">
        <h2>{t("vacancy.text")}</h2>
        <Field label="" help={t("vacancy.vacancyTextHelp")}>
          <textarea name="vacancyText" defaultValue={v?.vacancyText ?? ""} maxLength={100000} className="min-h-[16rem]" />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary">{t("common.save")}</button>
        <Link href={v ? `/vacancies/${v.id}` : "/"} className="btn">
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
