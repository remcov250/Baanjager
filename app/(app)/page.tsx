import Link from "next/link";
import { LAYERS, STATUSES, VERDICTS } from "@/db/schema";
import { StatusBadge, VerdictBadge, formatDate } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { listVacancySummaries } from "@/lib/vacancies";

type Search = { q?: string; layer?: string; verdict?: string; status?: string; closed?: string };

export default async function VacanciesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { t } = await getT();
  const params = await searchParams;
  const rows = listVacancySummaries({
    q: params.q,
    layer: params.layer,
    verdict: params.verdict,
    status: params.status,
    closed: params.closed === "1",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1>{t("vacancies.title")}</h1>
        <Link href="/vacancies/new" className="btn btn-primary">
          + <span className="hidden sm:inline">{t("vacancies.new")}</span>
          <span className="sm:hidden">{t("common.add")}</span>
        </Link>
      </div>

      <form className="card grid grid-cols-2 gap-3 py-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 sm:min-w-[12rem] sm:flex-1">
          <label htmlFor="q">{t("common.search")}</label>
          <input id="q" type="search" name="q" defaultValue={params.q ?? ""} placeholder={t("vacancies.searchPlaceholder")} />
        </div>
        <div>
          <label htmlFor="layer">{t("vacancies.colLayer")}</label>
          <select id="layer" name="layer" defaultValue={params.layer ?? ""}>
            <option value="">{t("common.all")}</option>
            {LAYERS.map((l) => (
              <option key={l} value={l}>{t(`layer.${l}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="verdict">{t("vacancies.colVerdict")}</label>
          <select id="verdict" name="verdict" defaultValue={params.verdict ?? ""}>
            <option value="">{t("common.all")}</option>
            {VERDICTS.map((v) => (
              <option key={v} value={v}>{t(`verdict.${v}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status">{t("vacancies.colStatus")}</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-normal">
          <input type="checkbox" name="closed" value="1" defaultChecked={params.closed === "1"} />
          {t("vacancies.showClosed")}
        </label>
        <button className="btn col-span-2 justify-center sm:col-span-1">{t("common.search")}</button>
      </form>

      <p className="text-sm text-stone-500">{t("vacancies.count", { n: rows.length })}</p>

      {rows.length === 0 ? (
        <p className="card text-sm text-stone-600">{t("vacancies.empty")}</p>
      ) : (
        <>
          {/* Phone: one card per vacancy, the whole card is the link. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((v) => (
              <li key={v.id}>
                <Link href={`/vacancies/${v.id}`} className="card block space-y-1.5 active:bg-orange-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.employer}</p>
                      <p className="truncate text-sm text-stone-600">{v.title}</p>
                    </div>
                    <VerdictBadge verdict={v.verdict} t={t} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                    <StatusBadge status={v.status} t={t} />
                    <span>
                      {t(`layer.${v.layer}`)}
                      {v.location ? ` · ${v.location}` : ""}
                    </span>
                    {v.foundOn ? <span>{formatDate(v.foundOn)}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet and up: the table. */}
          <div className="card hidden overflow-x-auto p-0 sm:block">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2">{t("vacancies.colEmployer")}</th>
                  <th className="px-4 py-2">{t("vacancies.colTitle")}</th>
                  <th className="px-4 py-2">{t("vacancies.colLayer")}</th>
                  <th className="px-4 py-2">{t("vacancies.colVerdict")}</th>
                  <th className="px-4 py-2">{t("vacancies.colStatus")}</th>
                  <th className="px-4 py-2">{t("vacancies.colFound")}</th>
                  <th className="hidden px-4 py-2 lg:table-cell">{t("vacancies.colApplied")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((v) => (
                  <tr key={v.id} className="hover:bg-orange-50/40">
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/vacancies/${v.id}`} className="hover:underline">{v.employer}</Link>
                    </td>
                    <td className="px-4 py-2">{v.title}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {t(`layer.${v.layer}`)}
                      {v.location ? <span className="text-stone-400"> · {v.location}</span> : null}
                    </td>
                    <td className="px-4 py-2"><VerdictBadge verdict={v.verdict} t={t} /></td>
                    <td className="px-4 py-2"><StatusBadge status={v.status} t={t} /></td>
                    <td className="whitespace-nowrap px-4 py-2 text-stone-500">{formatDate(v.foundOn)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-2 text-stone-500 lg:table-cell">{formatDate(v.appliedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
