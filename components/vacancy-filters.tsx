"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { LAYERS, STATUSES, VERDICTS } from "@/db/schema";
import { Icon } from "@/components/icons";
import { translator, type Locale } from "@/lib/i18n-core";

type Props = {
  locale: Locale;
  q: string;
  layer: string;
  verdict: string;
  status: string;
  closed: boolean;
};

// Every change navigates immediately — no separate search button. The text
// input is debounced so typing doesn't fire a request per keystroke; the
// selects and the checkbox apply the moment they change.
//
// Takes `locale` rather than a `t` function: a Server Component can't pass a
// closure to a Client Component, so the translator is rebuilt here from the
// (serializable) locale instead.
export function VacancyFilters({ locale, q, layer, verdict, status, closed }: Props) {
  const t = useMemo(() => translator(locale), [locale]);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: Partial<{ q: string; layer: string; verdict: string; status: string; closed: boolean }>) {
    const merged = { q, layer, verdict, status, closed, ...next };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.layer) sp.set("layer", merged.layer);
    if (merged.verdict) sp.set("verdict", merged.verdict);
    if (merged.status) sp.set("status", merged.status);
    if (merged.closed) sp.set("closed", "1");
    router.push(`/vacancies${sp.size ? `?${sp}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="q" className="sr-only">{t("common.search")}</label>
        <div className="relative flex-1 sm:max-w-xs">
          <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            id="q"
            type="search"
            defaultValue={q}
            placeholder={t("vacancies.searchPlaceholder")}
            className="mt-0! pl-9!"
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (debounce.current) clearTimeout(debounce.current);
              debounce.current = setTimeout(() => push({ q: value }), 300);
            }}
          />
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <label htmlFor="layer" className="sr-only">{t("vacancies.colLayer")}</label>
        <select id="layer" defaultValue={layer} onChange={(e) => push({ layer: e.currentTarget.value })} className="chip mt-0! w-auto! py-0! shadow-none!">
          <option value="">{t("vacancies.colLayer")}: {t("common.all")}</option>
          {LAYERS.map((l) => (
            <option key={l} value={l}>{t(`layer.${l}`)}</option>
          ))}
        </select>
        <label htmlFor="verdict" className="sr-only">{t("vacancies.colVerdict")}</label>
        <select id="verdict" defaultValue={verdict} onChange={(e) => push({ verdict: e.currentTarget.value })} className="chip mt-0! w-auto! py-0! shadow-none!">
          <option value="">{t("vacancies.colVerdict")}: {t("common.all")}</option>
          {VERDICTS.map((v) => (
            <option key={v} value={v}>{t(`verdict.${v}`)}</option>
          ))}
        </select>
        <label htmlFor="status" className="sr-only">{t("vacancies.colStatus")}</label>
        <select id="status" defaultValue={status} onChange={(e) => push({ status: e.currentTarget.value })} className="chip mt-0! w-auto! py-0! shadow-none!">
          <option value="">{t("vacancies.colStatus")}: {t("common.all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        {/* relative: the sr-only checkbox is absolutely positioned and must stay inside this scrolling row */}
        <label className={`chip relative cursor-pointer ${closed ? "chip-on" : ""}`}>
          <input
            type="checkbox"
            defaultChecked={closed}
            onChange={(e) => push({ closed: e.currentTarget.checked })}
            className="sr-only"
          />
          {t("vacancies.showClosed")}
        </label>
      </div>
    </div>
  );
}
