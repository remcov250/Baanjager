import { and, desc, eq, inArray, like, notInArray, or, sql, type SQL } from "drizzle-orm";
import {
  LAYERS,
  STATUSES,
  VERDICTS,
  type Layer,
  type NewVacancy,
  type Status,
  type Vacancy,
  type Verdict,
} from "@/db/schema";
import { getDb, schema } from "@/lib/db";
import { importRows, parseCsv, type ImportResult } from "@/lib/import";

const { vacancies } = schema;

export const CLOSED_STATUSES: Status[] = ["dropped", "rejected"];

export type VacancyFilters = {
  q?: string;
  layer?: string;
  verdict?: string;
  status?: string;
  closed?: boolean;
};

// The list view, the API list and the MCP list all use this: everything except
// the long text fields. A vacancy text can be 100 KB; a list of a hundred of
// them is not something to hand to a page or an assistant's context window.
const summaryColumns = {
  id: vacancies.id,
  employer: vacancies.employer,
  title: vacancies.title,
  url: vacancies.url,
  source: vacancies.source,
  sourceVerified: vacancies.sourceVerified,
  foundOn: vacancies.foundOn,
  assessedOn: vacancies.assessedOn,
  layer: vacancies.layer,
  location: vacancies.location,
  commuteMinutes: vacancies.commuteMinutes,
  hours: vacancies.hours,
  contractType: vacancies.contractType,
  officeDays: vacancies.officeDays,
  remoteNote: vacancies.remoteNote,
  salary: vacancies.salary,
  languageRequirement: vacancies.languageRequirement,
  verdict: vacancies.verdict,
  verdictReason: vacancies.verdictReason,
  status: vacancies.status,
  statusNote: vacancies.statusNote,
  appliedOn: vacancies.appliedOn,
  closedOn: vacancies.closedOn,
  feedbackCorrect: vacancies.feedbackCorrect,
  createdAt: vacancies.createdAt,
  updatedAt: vacancies.updatedAt,
};

export type VacancySummary = Pick<Vacancy, keyof typeof summaryColumns>;

function whereFor(filters: VacancyFilters): SQL | undefined {
  const where: SQL[] = [];

  if (filters.q) {
    const needle = `%${filters.q.replace(/[%_]/g, "")}%`;
    where.push(or(like(vacancies.employer, needle), like(vacancies.title, needle))!);
  }
  if (filters.layer && (LAYERS as readonly string[]).includes(filters.layer)) {
    where.push(eq(vacancies.layer, filters.layer as Layer));
  }
  if (filters.verdict && (VERDICTS as readonly string[]).includes(filters.verdict)) {
    where.push(eq(vacancies.verdict, filters.verdict as Verdict));
  }
  if (filters.status && (STATUSES as readonly string[]).includes(filters.status)) {
    where.push(eq(vacancies.status, filters.status as Status));
  } else if (!filters.closed) {
    where.push(notInArray(vacancies.status, CLOSED_STATUSES));
  }
  return where.length ? and(...where) : undefined;
}

export function listVacancySummaries(filters: VacancyFilters = {}): VacancySummary[] {
  return getDb()
    .select(summaryColumns)
    .from(vacancies)
    .where(whereFor(filters))
    .orderBy(desc(vacancies.foundOn), desc(vacancies.id))
    .all();
}

// Full rows, long text included — for export and single-vacancy views.
export function listVacancies(filters: VacancyFilters = {}): Vacancy[] {
  return getDb()
    .select()
    .from(vacancies)
    .where(whereFor(filters))
    .orderBy(desc(vacancies.foundOn), desc(vacancies.id))
    .all();
}

export function getVacancy(id: number): Vacancy | undefined {
  return getDb().select().from(vacancies).where(eq(vacancies.id, id)).get();
}

export function createVacancy(input: NewVacancy): Vacancy {
  return getDb().insert(vacancies).values(input).returning().get();
}

export function updateVacancy(id: number, input: Partial<NewVacancy>): Vacancy | undefined {
  return getDb()
    .update(vacancies)
    .set({ ...input, updatedAt: sql`(datetime('now'))` })
    .where(eq(vacancies.id, id))
    .returning()
    .get();
}

// Idempotent: linking the same resume again changes nothing, so an assistant
// that retries never bumps the timestamp or loses the URL. A different resume
// replaces the link; null clears it.
export function setCvLink(
  id: number,
  link: { resumeId: string | null; url?: string | null },
): Vacancy | undefined {
  const current = getVacancy(id);
  if (!current) return undefined;
  if (link.resumeId === null) {
    if (current.cvResumeId === null) return current;
    return updateVacancy(id, { cvResumeId: null, cvUrl: null, cvLinkedAt: null });
  }
  const url = link.url === undefined ? current.cvUrl : link.url;
  if (current.cvResumeId === link.resumeId && current.cvUrl === url) return current;
  return updateVacancy(id, {
    cvResumeId: link.resumeId,
    cvUrl: url,
    cvLinkedAt: current.cvResumeId === link.resumeId ? current.cvLinkedAt : new Date().toISOString(),
  });
}

export function vacancyExists(employer: string, title: string): boolean {
  const row = getDb()
    .select({ id: vacancies.id })
    .from(vacancies)
    .where(
      and(
        sql`lower(${vacancies.employer}) = lower(${employer})`,
        sql`lower(${vacancies.title}) = lower(${title})`,
      ),
    )
    .get();
  return Boolean(row);
}

// One transaction for the whole file: a thousand rows is one commit instead of a
// thousand, and a failure halfway leaves nothing behind. Shared by the settings
// page and the API so both import exactly the same way.
export function importVacanciesCsv(text: string): ImportResult {
  const rows = parseCsv(text);
  return getDb().transaction(() =>
    importRows(rows, vacancyExists, (v) => {
      createVacancy(v);
    }),
  );
}

export function vacancyOptions(): { id: number; employer: string; title: string }[] {
  return getDb()
    .select({ id: vacancies.id, employer: vacancies.employer, title: vacancies.title })
    .from(vacancies)
    .orderBy(desc(vacancies.id))
    .all();
}

export function countByStatus(statuses: Status[]): number {
  const row = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(vacancies)
    .where(inArray(vacancies.status, statuses))
    .get();
  return row?.n ?? 0;
}
