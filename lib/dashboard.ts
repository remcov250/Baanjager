import { LAYERS, STATUSES, VERDICTS, type Layer, type Status, type Verdict } from "@/db/schema";
import { listRules, type RuleWithSource } from "@/lib/rules";
import { CLOSED_STATUSES, listVacancySummaries, type VacancySummary } from "@/lib/vacancies";

export type Attention =
  | { kind: "silent"; vacancy: VacancySummary; days: number }
  | { kind: "assess"; vacancy: VacancySummary }
  // Looked at, but the text didn't say enough: something to ask, not to drop.
  | { kind: "ask"; vacancy: VacancySummary }
  | { kind: "feedback"; vacancy: VacancySummary };

export type Dashboard = {
  total: number;
  byStatus: Record<Status, number>;
  byVerdict: Record<Verdict, number>;
  droppedByLayer: Record<Layer, number>;
  closed: number;
  // The list is capped for the page; the count is not, so the tile stays honest.
  attention: Attention[];
  attentionTotal: number;
  latestRules: RuleWithSource[];
  activeRules: number;
};

const SILENT_AFTER_DAYS = 7;

function daysSince(date: string, now: Date): number {
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export function dashboard(now = new Date()): Dashboard {
  const all = listVacancySummaries({ closed: true });
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const byVerdict = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<Verdict, number>;
  const droppedByLayer = Object.fromEntries(LAYERS.map((l) => [l, 0])) as Record<Layer, number>;

  const silent: Attention[] = [];
  const assess: Attention[] = [];
  const ask: Attention[] = [];
  const feedback: Attention[] = [];

  for (const v of all) {
    byStatus[v.status] += 1;
    byVerdict[v.verdict] += 1;
    const isClosed = CLOSED_STATUSES.includes(v.status);
    if (isClosed) droppedByLayer[v.layer] += 1;

    if (v.status === "applied" && v.appliedOn) {
      const days = daysSince(v.appliedOn, now);
      if (days >= SILENT_AFTER_DAYS) silent.push({ kind: "silent", vacancy: v, days });
    }
    if (!isClosed && v.verdict === "pending") assess.push({ kind: "assess", vacancy: v });
    if (!isClosed && v.verdict === "uncertain" && v.status === "new") ask.push({ kind: "ask", vacancy: v });
    if (v.status === "rejected" && !v.feedbackCorrect) feedback.push({ kind: "feedback", vacancy: v });
  }

  silent.sort((a, b) => (b.kind === "silent" && a.kind === "silent" ? b.days - a.days : 0));
  const rules = listRules(false);
  const attention = [...silent, ...assess, ...ask, ...feedback];

  return {
    total: all.length,
    byStatus,
    byVerdict,
    droppedByLayer,
    closed: byStatus.dropped + byStatus.rejected,
    attention: attention.slice(0, 6),
    attentionTotal: attention.length,
    latestRules: rules.slice(0, 3),
    activeRules: rules.length,
  };
}
