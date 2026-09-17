import { cloneElement, useId } from "react";
import type { RuleKind, Status, Verdict } from "@/db/schema";
import type { Translate } from "@/lib/i18n";

export function Field({
  label,
  help,
  children,
  className,
}: {
  label: string;
  help?: string;
  children: React.ReactElement<{ id?: string }>;
  className?: string;
}) {
  // Explicit htmlFor/id rather than wrapping the control in the label: a
  // wrapped <select> gets its selected option appended to its accessible
  // name, which confuses screen readers and getByLabel alike.
  const generated = useId();
  const id = children.props.id ?? generated;
  return (
    <div className={className}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      {cloneElement(children, { id })}
      {help ? <p className="help">{help}</p> : null}
    </div>
  );
}

export const verdictColors: Record<Verdict, string> = {
  match: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  possible: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
  weak: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  no_match: "bg-stone-200 text-stone-700 dark:bg-stone-700/60 dark:text-stone-300",
  pending: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  na: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export const statusColors: Record<Status, string> = {
  new: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  applied: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  interview: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  offer: "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/50 dark:text-emerald-200",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  dropped: "bg-stone-200 text-stone-600 dark:bg-stone-700/60 dark:text-stone-300",
};

export const ruleKindColors: Record<RuleKind, string> = {
  knockout: "bg-fg text-bg",
  heavy_negative: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  heavy_positive: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  open_question: "bg-surface-2 text-muted border border-line",
};

export function VerdictBadge({ verdict, t }: { verdict: Verdict; t: Translate }) {
  return <span className={`badge ${verdictColors[verdict]}`}>{t(`verdict.${verdict}`)}</span>;
}

export function StatusBadge({ status, t }: { status: Status; t: Translate }) {
  return <span className={`badge ${statusColors[status]}`}>{t(`status.${status}`)}</span>;
}

export function RuleKindBadge({ kind, t }: { kind: RuleKind; t: Translate }) {
  return <span className={`badge ${ruleKindColors[kind]}`}>{t(`ruleKind.${kind}`)}</span>;
}

export function Select<T extends string>({
  name,
  value,
  options,
  t,
  prefix,
  defaultValue,
  id,
}: {
  name: string;
  value?: T;
  defaultValue?: T;
  options: readonly T[];
  t: Translate;
  prefix: string;
  id?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? value}>
      {options.map((option) => (
        <option key={option} value={option}>
          {t(`${prefix}.${option}`)}
        </option>
      ))}
    </select>
  );
}

export function formatDate(value: string | null | undefined): string {
  return value ? value : "—";
}

// "12 sep" style, locale aware; falls back to the raw value for odd input.
export function shortDate(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}
