import { cloneElement, useId } from "react";
import type { Status, Verdict } from "@/db/schema";
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

const verdictColors: Record<Verdict, string> = {
  match: "bg-green-100 text-green-800",
  possible: "bg-lime-100 text-lime-800",
  weak: "bg-amber-100 text-amber-800",
  no_match: "bg-stone-200 text-stone-700",
  pending: "bg-sky-100 text-sky-800",
  na: "bg-stone-100 text-stone-500",
};

const statusColors: Record<Status, string> = {
  new: "bg-sky-100 text-sky-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  applied: "bg-green-100 text-green-800",
  interview: "bg-emerald-100 text-emerald-800",
  offer: "bg-emerald-200 text-emerald-900",
  on_hold: "bg-amber-100 text-amber-800",
  rejected: "bg-rose-100 text-rose-800",
  dropped: "bg-stone-200 text-stone-600",
};

export function VerdictBadge({ verdict, t }: { verdict: Verdict; t: Translate }) {
  return <span className={`badge ${verdictColors[verdict]}`}>{t(`verdict.${verdict}`)}</span>;
}

export function StatusBadge({ status, t }: { status: Status; t: Translate }) {
  return <span className={`badge ${statusColors[status]}`}>{t(`status.${status}`)}</span>;
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
