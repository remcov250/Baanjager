import { LAYERS } from "@/db/schema";
import { createSourceAction, deleteSourceAction, toggleSourceAction, updateSourceAction } from "@/app/(app)/sources/actions";
import { Icon } from "@/components/icons";
import { Field, Select } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { listSources } from "@/lib/sources";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; open?: string }>;
}) {
  const { t } = await getT();
  const params = await searchParams;
  const sources = listSources();
  const openId = Number(params.open);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h1>{t("sources.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("sources.intro")}</p>
      </div>

      {params.saved ? <p className="notice">{t("common.saved")}</p> : null}
      {params.error ? <p className="notice">{t("common.validationError")}</p> : null}

      <details className="fold card py-3" open={Boolean(params.error)}>
        <summary>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Icon.plus className="h-4 w-4" />
          </span>
          <span className="font-semibold">{t("sources.add")}</span>
          <Icon.chevron className="fold-chevron" />
        </summary>
        <form action={createSourceAction} className="flex flex-col gap-3 pt-3">
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
          <div>
            <button className="btn btn-primary">{t("sources.add")}</button>
          </div>
        </form>
      </details>

      {sources.length === 0 ? (
        <p className="card text-sm text-muted">{t("sources.empty")}</p>
      ) : (
        LAYERS.filter((layer) => sources.some((s) => s.layer === layer)).map((layer) => {
          const rows = sources.filter((s) => s.layer === layer);
          return (
            <section key={layer} className="card py-3">
              <div className="flex items-baseline gap-2 pb-1">
                <h2>{t(`layer.${layer}`)}</h2>
                <span className="text-[13px] text-muted">{rows.length}</span>
              </div>
              {rows.map((s) => (
                <details key={s.id} className={`fold border-t border-line-soft ${s.active ? "" : "opacity-60"}`} open={s.id === openId}>
                  <summary className="py-1">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{s.label}</span>
                      <span className="truncate text-[13px] text-muted">
                        {[s.cadence, s.active ? null : t("sources.inactive"), s.note].filter(Boolean).join(" · ") || t("common.none")}
                      </span>
                    </span>
                    <Icon.chevron className="fold-chevron" />
                  </summary>
                  <div className="flex flex-col gap-3 pb-4">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep">
                        {t("common.open")}
                        <Icon.external className="h-[14px] w-[14px]" />
                      </a>
                    ) : null}
                    <form action={updateSourceAction} className="flex flex-col gap-3 rounded-lg bg-surface-2 p-3">
                      <input type="hidden" name="id" value={s.id} />
                      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_10rem]">
                        <Field label={t("vacancy.layer")}>
                          <Select name="layer" defaultValue={s.layer} options={LAYERS} t={t} prefix="layer" />
                        </Field>
                        <Field label={t("sources.label")}>
                          <input type="text" name="label" defaultValue={s.label} required maxLength={200} />
                        </Field>
                        <Field label={t("sources.cadence")}>
                          <input type="text" name="cadence" defaultValue={s.cadence ?? ""} maxLength={100} />
                        </Field>
                      </div>
                      <Field label={t("sources.url")}>
                        <input type="url" name="url" defaultValue={s.url ?? ""} maxLength={2000} />
                      </Field>
                      <Field label={t("sources.note")}>
                        <input type="text" name="note" defaultValue={s.note ?? ""} maxLength={2000} />
                      </Field>
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="btn btn-primary btn-sm">{t("common.save")}</button>
                        <button formAction={toggleSourceAction} name="active" value={s.active ? "0" : "1"} className="btn btn-sm">
                          {s.active ? t("sources.deactivate") : t("sources.activate")}
                        </button>
                        <button formAction={deleteSourceAction} className="btn btn-sm ml-auto text-rose-700 dark:text-rose-300">
                          {t("common.delete")}
                        </button>
                      </div>
                    </form>
                  </div>
                </details>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
