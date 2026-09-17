import { desc, eq, isNull, sql } from "drizzle-orm";
import type { Rule, RuleKind } from "@/db/schema";
import { getDb, schema } from "@/lib/db";

const { rules, vacancies } = schema;

export type RuleWithSource = Rule & { sourceEmployer: string | null; sourceTitle: string | null };

export function listRules(includeRetired = false): RuleWithSource[] {
  return getDb()
    .select({
      id: rules.id,
      kind: rules.kind,
      text: rules.text,
      rationale: rules.rationale,
      sourceVacancyId: rules.sourceVacancyId,
      retiredAt: rules.retiredAt,
      createdAt: rules.createdAt,
      updatedAt: rules.updatedAt,
      sourceEmployer: vacancies.employer,
      sourceTitle: vacancies.title,
    })
    .from(rules)
    .leftJoin(vacancies, eq(rules.sourceVacancyId, vacancies.id))
    .where(includeRetired ? undefined : isNull(rules.retiredAt))
    .orderBy(desc(rules.id))
    .all();
}

export function rulesForVacancy(vacancyId: number): Rule[] {
  return getDb().select().from(rules).where(eq(rules.sourceVacancyId, vacancyId)).all();
}

export function createRule(input: {
  kind: RuleKind;
  text: string;
  rationale?: string | null;
  sourceVacancyId?: number | null;
}): Rule {
  return getDb().insert(rules).values(input).returning().get();
}

export function setRuleRetired(id: number, retired: boolean): void {
  getDb()
    .update(rules)
    .set({
      retiredAt: retired ? sql`(datetime('now'))` : null,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(rules.id, id))
    .run();
}
