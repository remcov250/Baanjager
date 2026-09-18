import { LAYERS, STATUSES, VERDICTS, type Layer, type Status, type Verdict } from "@/db/schema";
import { listRules, type RuleWithSource } from "@/lib/rules";
import { CLOSED_STATUSES, listVacancySummaries, type VacancySummary } from "@/lib/vacancies";

// A vacancy that reads as a real fit and hasn't been applied to (or dropped)
// yet: the one thing on the homepage that means "you could act on this today".
const POTENTIAL_VERDICTS: Verdict[] = ["match", "possible"];
const POTENTIAL_STATUSES: Status[] = ["new", "on_hold"];
const verdictRank: Partial<Record<Verdict, number>> = { match: 0, possible: 1 };

export type Dashboard = {
  total: number;
  byStatus: Record<Status, number>;
  byVerdict: Record<Verdict, number>;
  droppedByLayer: Record<Layer, number>;
  closed: number;
  // The list is capped for the page; the count is not, so the tile stays honest.
  potentialMatches: VacancySummary[];
  potentialMatchesTotal: number;
  latestRules: RuleWithSource[];
  activeRules: number;
};

export function dashboard(): Dashboard {
  const all = listVacancySummaries({ closed: true });
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const byVerdict = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<Verdict, number>;
  const droppedByLayer = Object.fromEntries(LAYERS.map((l) => [l, 0])) as Record<Layer, number>;

  const potentialMatches: VacancySummary[] = [];

  for (const v of all) {
    byStatus[v.status] += 1;
    byVerdict[v.verdict] += 1;
    const isClosed = CLOSED_STATUSES.includes(v.status);
    if (isClosed) droppedByLayer[v.layer] += 1;

    if (POTENTIAL_STATUSES.includes(v.status) && POTENTIAL_VERDICTS.includes(v.verdict)) {
      potentialMatches.push(v);
    }
  }

  potentialMatches.sort((a, b) => (verdictRank[a.verdict] ?? 9) - (verdictRank[b.verdict] ?? 9));
  const rules = listRules(false);

  return {
    total: all.length,
    byStatus,
    byVerdict,
    droppedByLayer,
    closed: byStatus.dropped + byStatus.rejected,
    potentialMatches: potentialMatches.slice(0, 6),
    potentialMatchesTotal: potentialMatches.length,
    latestRules: rules.slice(0, 3),
    activeRules: rules.length,
  };
}
