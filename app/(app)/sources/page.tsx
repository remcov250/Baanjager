import { LAYERS } from "@/db/schema";
import { createSourceAction, deleteSourceAction, toggleSourceAction } from "@/app/(app)/sources/actions";
import { Field, Select } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { listSources } from "@/lib/sources";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { t } = await getT();
  const params = await searchParams;
  const sources = listSources();

  return (
    <div className="space-y-6">
      <div>
        <h1>{t("sources.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("sources.intro")}</p>
      </div>

      {params.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {params.error ? <p className="notice">{t("common.validationError")}</p> : null}

      {sources.length === 0 ? (
        <p className="card text-sm text-muted">{t("sources.empty")}</p>
      ) : (
        LAYERS.filter((layer) => sources.some((s) => s.layer === layer)).map((layer) => (
          <section key={layer} className="card space-y-2">
            <h2>{t(`layer.${layer}`)}</h2>
            <ul className="divide-y divide-line-soft">
              {sources
                .filter((s) => s.layer === layer)
                .map((s) => (
                  <li key={s.id} className={`flex flex-wrap items-start gap-3 py-2 ${s.active ? "" : "opacity-50"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                            {s.label} ↗
                          </a>
                        ) : (
                          s.label
                        )}
                        {s.cadence ? <span className="ml-2 badge bg-surface-2 text-muted">{s.cadence}</span> : null}
                      </p>
                      {s.note ? <p className="text-xs text-muted">{s.note}</p> : null}
                    </div>
                    <form action={toggleSourceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                      <button className="btn btn-sm">{s.active ? t("sources.deactivate") : t("sources.activate")}</button>
                    </form>
                    <form action={deleteSourceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn-sm text-rose-700 dark:text-rose-300">{t("common.delete")}</button>
                    </form>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      <section className="card space-y-3">
        <h2>{t("sources.add")}</h2>
        <form action={createSourceAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr_10rem]">
            <Field label={t("vacancy.layer")}>
              <Select name="layer" defaultValue="local" options={LAYERS} t={t} prefix="layer" />
            </Field>
            <Field label={t("sources.label")}>
              <input type="text" name="label" required maxLength={200} />
            </Field>
            <Field label={t("sources.cadence")} help={t("sources.cadenceHelp")}>
              <input type="text" name="cadence" maxLength={100} />
            </Field>
          </div>
          <Field label={t("sources.url")} help={t("sources.urlHelp")}>
            <input type="url" name="url" maxLength={2000} />
          </Field>
          <Field label={t("sources.note")} help={t("sources.noteHelp")}>
            <input type="text" name="note" maxLength={2000} />
          </Field>
          <button className="btn btn-primary">{t("sources.add")}</button>
        </form>
      </section>
    </div>
  );
}
