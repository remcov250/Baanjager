import Link from "next/link";
import { LAYERS, type Status } from "@/db/schema";
import { Icon } from "@/components/icons";
import { RuleKindBadge, shortDate } from "@/components/ui";
import { dashboard } from "@/lib/dashboard";
import { getT, type Translate } from "@/lib/i18n";

const PIPELINE: { status: Status; color: string }[] = [
  { status: "new", color: "#7dd3fc" },
  { status: "in_progress", color: "#a5b4fc" },
  { status: "applied", color: "#4ade80" },
  { status: "interview", color: "#059669" },
  { status: "offer", color: "#065f46" },
  { status: "on_hold", color: "#fcd34d" },
  { status: "rejected", color: "#fda4af" },
];

const LAYER_BAR = ["#c2410c", "#ea580c", "#fb923c", "#fdba74", "#fed7aa"];

const attentionBadge = {
  silent: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  assess: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  feedback: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

function greetingKey(hour: number): string {
  if (hour < 12) return "dashboard.morning";
  if (hour < 18) return "dashboard.afternoon";
  return "dashboard.evening";
}

export default async function DashboardPage() {
  const { t, locale } = await getT();
  const d = dashboard();
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const open = d.byStatus.new + d.byStatus.in_progress;
  const running = d.total - d.byStatus.dropped;
  const pipeline = PIPELINE.filter((p) => d.byStatus[p.status] > 0);
  const layers = LAYERS.map((l) => ({ layer: l, n: d.droppedByLayer[l] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const layerMax = layers[0]?.n ?? 1;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header className="flex items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="hidden sm:block">{t("nav.dashboard")}</h1>
          <h1 className="sm:hidden">{t(greetingKey(now.getHours()))}</h1>
          <span className="text-muted">
            <span className="hidden sm:inline">{dateLabel} · </span>
            {t("dashboard.waiting", { n: d.attention.length })}
          </span>
        </div>
        <Link href="/vacancies/new" className="btn btn-primary ml-auto hidden sm:inline-flex">
          <Icon.plus className="h-4 w-4" />
          {t("vacancies.new")}
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <div className="card order-1 flex flex-col gap-1.5 border-accent-line bg-accent-tint sm:order-3">
          <span className="label text-accent">{t("dashboard.needsYou")}</span>
          <span className="stat text-accent">{d.attention.length}</span>
          <span className="hidden text-[13px] text-accent-fg sm:block">{t("dashboard.needsYouHint")}</span>
        </div>
        <div className="card order-2 flex flex-col gap-1.5 sm:order-1">
          <span className="label">{t("dashboard.open")}</span>
          <span className="stat">{open}</span>
          <span className="hidden text-[13px] text-muted sm:block">
            {t("dashboard.openHint", { new: d.byStatus.new, progress: d.byStatus.in_progress })}
          </span>
        </div>
        <div className="card order-3 flex flex-col gap-1.5 sm:order-2">
          <span className="label">{t("status.applied")}</span>
          <span className="stat">{d.byStatus.applied + d.byStatus.interview + d.byStatus.offer}</span>
          <span className="hidden text-[13px] text-muted sm:block">
            {t("dashboard.appliedHint", { n: d.byStatus.interview + d.byStatus.offer })}
          </span>
        </div>
        <div className="card order-4 flex flex-col gap-1.5">
          <span className="label">{t("status.dropped")}</span>
          <span className="stat">{d.closed}</span>
          <span className="hidden text-[13px] text-muted sm:block">
            {t("dashboard.droppedHint", { total: d.total })}
          </span>
        </div>
      </section>

      <section className="card flex flex-col gap-3 sm:hidden">
        <AttentionList t={t} locale={locale} d={d} compact />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-4">
          <div className="flex items-baseline gap-2.5">
            <h2>{t("dashboard.pipeline")}</h2>
            <span className="text-[13px] text-muted">{t("dashboard.pipelineHint", { n: running })}</span>
          </div>
          {pipeline.length ? (
            <>
              <div className="flex h-3.5 gap-[3px] overflow-hidden rounded-md">
                {pipeline.map((p) => (
                  <div key={p.status} style={{ flexGrow: d.byStatus[p.status], background: p.color }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3">
                {pipeline.map((p) => (
                  <div key={p.status} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                    {t(`status.${p.status}`)}
                    <strong className="ml-auto">{d.byStatus[p.status]}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("vacancies.empty")}</p>
          )}
        </div>

        <div className="card flex flex-col gap-3.5">
          <div className="flex items-baseline gap-2.5">
            <h2>{t("dashboard.droppedByLayer")}</h2>
            <span className="text-[13px] text-muted">{t("dashboard.droppedByLayerHint", { n: d.closed })}</span>
          </div>
          {layers.length ? (
            <div className="flex flex-col gap-2.5 text-[13px]">
              {layers.map((x, i) => (
                <div key={x.layer} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3">
                  <span>{t(`layer.${x.layer}`)}</span>
                  <div className="h-2.5 rounded-[5px] bg-line-soft">
                    <div
                      className="h-2.5 rounded-[5px]"
                      style={{ width: `${Math.max(4, (x.n / layerMax) * 100)}%`, background: LAYER_BAR[i] ?? LAYER_BAR[4] }}
                    />
                  </div>
                  <strong className="text-right">{x.n}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("common.none")}</p>
          )}
          <Link href="/criteria" className="text-[13px] font-medium text-accent hover:text-accent-deep">
            {t("dashboard.criteriaLink")} →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="card hidden flex-col sm:flex">
          <AttentionList t={t} locale={locale} d={d} />
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2.5 pb-1.5">
            <h2>{t("dashboard.latestRules")}</h2>
            <Link href="/criteria" className="ml-auto text-[13px] font-medium text-accent hover:text-accent-deep">
              {t("nav.criteria")} →
            </Link>
          </div>
          {d.latestRules.length ? (
            d.latestRules.map((r) => (
              <div key={r.id} className="flex items-start gap-3 border-t border-line-soft py-3 first:border-t-0">
                <RuleKindBadge kind={r.kind} t={t} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span>{r.text}</span>
                  <span className="text-xs text-muted">
                    {r.sourceVacancyId ? (
                      <Link href={`/vacancies/${r.sourceVacancyId}`} className="hover:underline">
                        {t("dashboard.learnedFrom")} {r.sourceEmployer}
                      </Link>
                    ) : (
                      t("criteria.sourceVacancyNone")
                    )}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-muted">{t("criteria.empty")}</p>
          )}
        </div>
      </section>

      <Link
        href="/vacancies/new"
        className="fixed bottom-[84px] right-[18px] z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-white shadow-fab sm:hidden"
        aria-label={t("vacancies.new")}
      >
        <Icon.plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

function AttentionList({
  t,
  locale,
  d,
  compact = false,
}: {
  t: Translate;
  locale: string;
  d: ReturnType<typeof dashboard>;
  compact?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 pb-1.5">
        <h2>{t("dashboard.needsYou")}</h2>
        <Link href="/vacancies" className="ml-auto text-[13px] font-medium text-accent hover:text-accent-deep">
          {compact ? t("common.all") : t("dashboard.allVacancies")} →
        </Link>
      </div>
      {d.attention.length === 0 ? (
        <p className="py-2 text-sm text-muted">{t("dashboard.nothingWaiting")}</p>
      ) : (
        d.attention.map((a) => {
          const v = a.vacancy;
          const label =
            a.kind === "silent"
              ? t("dashboard.silent", { d: a.days })
              : a.kind === "assess"
                ? t("dashboard.assess")
                : t("dashboard.feedback");
          return (
            <Link
              key={`${a.kind}-${v.id}`}
              href={`/vacancies/${v.id}`}
              className="flex min-h-[56px] items-center gap-3 border-t border-line-soft py-2.5 first-of-type:border-t-0 hover:bg-surface-2"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold">
                  {v.employer}
                  <span className="hidden font-normal text-muted sm:inline"> — {v.title}</span>
                </span>
                <span className="truncate text-[13px] text-muted">
                  <span className="sm:hidden">{v.title} · </span>
                  {t(`layer.${v.layer}`)}
                  {v.location ? ` · ${v.location}` : ""}
                  {v.foundOn ? ` · ${shortDate(v.foundOn, locale)}` : ""}
                </span>
              </div>
              <span className={`badge ${attentionBadge[a.kind]}`}>{label}</span>
              <Icon.chevron className="hidden h-[18px] w-[18px] text-muted-2 sm:block" />
            </Link>
          );
        })
      )}
    </>
  );
}
