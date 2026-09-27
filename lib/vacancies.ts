import { and, desc, eq, inArray, notInArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
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

// A substring match where % and _ in the text are just characters, not LIKE
// wildcards: "senior_dev" finds "senior_dev", not "seniordev".
function contains(column: AnyColumn, text: string): SQL {
  const needle = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return sql`${column} LIKE ${needle} ESCAPE '\\'`;
}

function whereFor(filters: VacancyFilters): SQL | undefined {
  const where: SQL[] = [];

  if (filters.q) {
    where.push(or(contains(vacancies.employer, filters.q), contains(vacancies.title, filters.q), contains(vacancies.url, filters.q))!);
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

// Two links point at the same posting when their normalised keys match. A
// LinkedIn job has one numeric id behind many URLs (nl./de./www., with or
// without the slug, /jobs/view/<id> or ?currentJobId=<id>), so the id is the
// key. Any other URL is compared without scheme, "www.", fragment, trailing
// slash and tracking parameters. The rest of the query stays: on many boards
// it is the job id (Indeed's viewjob?jk=…), and dropping it made every job on
// such a board look like the first one.
const TRACKING_PARAM = /^(utm(_.*)?|trk.*|refid|ref|src|fbclid|gclid|msclkid|mc_[a-z]+|_hs[a-z]+|sessionid|originalsubdomain)$/i;

export function postingKey(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    const id =
      parsed.pathname.match(/\/jobs\/view\/(?:[^/]*?-)?(\d{6,})\/?$/)?.[1] ??
      parsed.searchParams.get("currentJobId")?.match(/^\d{6,}$/)?.[0];
    if (id) return `linkedin:${id}`;
  }
  const query = [...parsed.searchParams]
    .filter(([name, value]) => value !== "" && !TRACKING_PARAM.test(name))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return `${host}${parsed.pathname.replace(/\/+$/, "").toLowerCase()}${query ? `?${query}` : ""}`;
}

// The vacancy that already holds this posting, if any. Used to refuse a second
// row for the same link; the caller can override when two roles really share
// one page.
export function findVacancyByPosting(url: string | null | undefined): { id: number; employer: string; title: string } | undefined {
  const key = postingKey(url);
  if (!key) return undefined;
  const numeric = key.startsWith("linkedin:") ? key.slice("linkedin:".length) : null;
  const candidates = getDb()
    .select({ id: vacancies.id, employer: vacancies.employer, title: vacancies.title, url: vacancies.url })
    .from(vacancies)
    .where(contains(vacancies.url, numeric ?? key.split(/[/?]/)[0]))
    .all();
  const hit = candidates.find((row) => postingKey(row.url) === key);
  return hit ? { id: hit.id, employer: hit.employer, title: hit.title } : undefined;
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

// The picker on the criteria page. Vacancies are never deleted, so "all of
// them" grows forever; the most recently touched ones are the ones a new rule
// comes from. An older one is still reachable via "make a rule" on its page.
export const VACANCY_OPTIONS_LIMIT = 200;

export function vacancyOptions(): { id: number; employer: string; title: string }[] {
  return getDb()
    .select({ id: vacancies.id, employer: vacancies.employer, title: vacancies.title })
    .from(vacancies)
    .orderBy(desc(vacancies.updatedAt), desc(vacancies.id))
    .limit(VACANCY_OPTIONS_LIMIT)
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
