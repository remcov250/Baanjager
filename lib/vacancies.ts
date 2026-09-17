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

const { vacancies } = schema;

export const CLOSED_STATUSES: Status[] = ["dropped", "rejected"];

export type VacancyFilters = {
  q?: string;
  layer?: string;
  verdict?: string;
  status?: string;
  closed?: boolean;
};

export function listVacancies(filters: VacancyFilters = {}): Vacancy[] {
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

  return getDb()
    .select()
    .from(vacancies)
    .where(where.length ? and(...where) : undefined)
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
