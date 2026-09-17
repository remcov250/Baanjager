import { STATUSES } from "@/db/schema";
import { json, requireApi } from "@/lib/api";
import { listRules } from "@/lib/rules";
import { listVacancySummaries } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

// One call that gives an assistant enough to "catch up" at the start of a
// session: what's open, what needs a decision, what was recently assessed.
export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;

  const all = listVacancySummaries({ closed: true });
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<string, number>;
  for (const v of all) byStatus[v.status] += 1;

  const brief = (v: (typeof all)[number]) => ({
    id: v.id,
    employer: v.employer,
    title: v.title,
    layer: v.layer,
    verdict: v.verdict,
    status: v.status,
    statusNote: v.statusNote,
    appliedOn: v.appliedOn,
    updatedAt: v.updatedAt,
  });

  return json({
    total: all.length,
    byStatus,
    pendingAssessment: all.filter((v) => v.verdict === "pending" && !["dropped", "rejected"].includes(v.status)).map(brief),
    open: all.filter((v) => ["applied", "interview", "offer", "in_progress"].includes(v.status)).map(brief),
    onHold: all.filter((v) => v.status === "on_hold").map(brief),
    recentlyUpdated: [...all].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 10).map(brief),
    activeRules: listRules(false).length,
  });
}
