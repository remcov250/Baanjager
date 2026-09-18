import Link from "next/link";
import { LAYERS, STATUSES, VERDICTS } from "@/db/schema";
import { Icon } from "@/components/icons";
import { StatusBadge, VerdictBadge, shortDate } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { listVacancySummaries } from "@/lib/vacancies";

type Search = { q?: string; layer?: string; verdict?: string; status?: string; closed?: string };

function conditions(v: { hours: string | null; officeDays: number | null; contractType: string; remoteNote: string | null }, t: (k: string) => string): string {
  const parts: string[] = [];
  if (v.hours) parts.push(`${v.hours} ${t("common.hoursShort")}`);
  if (v.officeDays !== null) parts.push(`${v.officeDays} ${t("common.officeDaysShort")}`);
  else if (v.remoteNote) parts.push(v.remoteNote);
  if (v.contractType !== "unknown") parts.push(t(`contract.${v.contractType}`).toLowerCase());
  return parts.join(" · ");
}

export default async function VacanciesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { t, locale } = await getT();
  const params = await searchParams;
  const rows = listVacancySummaries({
    q: params.q,
    layer: params.layer,
    verdict: params.verdict,
    status: params.status,
    closed: params.closed === "1",
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="flex items-center gap-3">
        <h1>{t("vacancies.title")}</h1>
        <span className="text-muted">{rows.length}</span>
        <Link href="/vacancies/new" className="btn btn-primary ml-auto hidden sm:inline-flex">
          <Icon.plus className="h-4 w-4" />
          {t("vacancies.new")}
        </Link>
      </header>

      <form className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="q" className="sr-only">{t("common.search")}</label>
          <div className="relative flex-1 sm:max-w-xs">
            <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input id="q" type="search" name="q" defaultValue={params.q ?? ""} placeholder={t("vacancies.searchPlaceholder")} className="mt-0! pl-9!" />
          </div>
          <button className="btn">{t("common.search")}</button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <label htmlFor="layer" className="sr-only">{t("vacancies.colLayer")}</label>
          <select id="layer" name="layer" defaultValue={params.layer ?? ""} className="chip mt-0! w-auto! py-0! shadow-none!">
            <option value="">{t("vacancies.colLayer")}: {t("common.all")}</option>
            {LAYERS.map((l) => (
              <option key={l} value={l}>{t(`layer.${l}`)}</option>
            ))}
          </select>
          <label htmlFor="verdict" className="sr-only">{t("vacancies.colVerdict")}</label>
          <select id="verdict" name="verdict" defaultValue={params.verdict ?? ""} className="chip mt-0! w-auto! py-0! shadow-none!">
            <option value="">{t("vacancies.colVerdict")}: {t("common.all")}</option>
            {VERDICTS.map((v) => (
              <option key={v} value={v}>{t(`verdict.${v}`)}</option>
            ))}
          </select>
          <label htmlFor="status" className="sr-only">{t("vacancies.colStatus")}</label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className="chip mt-0! w-auto! py-0! shadow-none!">
            <option value="">{t("vacancies.colStatus")}: {t("common.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
          {/* relative: the sr-only checkbox is absolutely positioned and must stay inside this scrolling row */}
          <label className={`chip relative cursor-pointer ${params.closed === "1" ? "chip-on" : ""}`}>
            <input type="checkbox" name="closed" value="1" defaultChecked={params.closed === "1"} className="sr-only" />
            {t("vacancies.showClosed")}
          </label>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="card text-sm text-muted">{t("vacancies.empty")}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5 sm:hidden">
            {rows.map((v) => (
              <li key={v.id}>
                <Link href={`/vacancies/${v.id}`} className="card flex flex-col gap-2 rounded-2xl p-4 active:bg-surface-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{v.employer}</span>
                      <span className="truncate text-sm text-muted">{v.title}</span>
                    </div>
                    <VerdictBadge verdict={v.verdict} t={t} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
                    <StatusBadge status={v.status} t={t} />
                    <span>
                      {t(`layer.${v.layer}`)}
                      {v.location ? ` · ${v.location}` : ""}
                    </span>
                    {conditions(v, t) ? <span>{conditions(v, t)}</span> : null}
                    <span className="ml-auto">{shortDate(v.foundOn, locale)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-x-auto p-0 sm:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left">
                <tr>
                  <th className="label px-4 py-2.5 font-medium">{t("vacancies.colEmployer")}</th>
                  <th className="label px-4 py-2.5 font-medium">{t("vacancies.colTitle")}</th>
                  <th className="label px-4 py-2.5 font-medium">{t("vacancies.colLayer")}</th>
                  <th className="label hidden px-4 py-2.5 font-medium lg:table-cell">{t("vacancy.conditions")}</th>
                  <th className="label px-4 py-2.5 font-medium">{t("vacancies.colVerdict")}</th>
                  <th className="label px-4 py-2.5 font-medium">{t("vacancies.colStatus")}</th>
                  <th className="label px-4 py-2.5 text-right font-medium">{t("vacancies.colFound")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((v) => (
                  <tr key={v.id} className="hover:bg-accent-tint/60">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/vacancies/${v.id}`} className="hover:underline">{v.employer}</Link>
                    </td>
                    <td className="px-4 py-3">{v.title}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {t(`layer.${v.layer}`)}
                      {v.location ? <span className="text-muted"> · {v.location}</span> : null}
                    </td>
                    <td className="hidden px-4 py-3 text-muted lg:table-cell">{conditions(v, t)}</td>
                    <td className="px-4 py-3"><VerdictBadge verdict={v.verdict} t={t} /></td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} t={t} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted">{shortDate(v.foundOn, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Link
        href="/vacancies/new"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-[18px] z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-white shadow-fab sm:hidden"
        aria-label={t("vacancies.new")}
      >
        <Icon.plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
