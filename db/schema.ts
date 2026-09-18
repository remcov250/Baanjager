import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Distance layers from the home base. The Dutch job market is regional and often
// cross-border, so "how far, and how many office days" decides more than salary.
export const LAYERS = ["local", "medium", "far", "remote", "na"] as const;
export type Layer = (typeof LAYERS)[number];

// The verdict scale is deliberately not binary. "uncertain" is the honest answer
// when the text doesn't say enough — unknown is not the same as no, and a
// vacancy that reads as uncertain is still worth a question or a closer look.
export const VERDICTS = ["pending", "match", "possible", "uncertain", "weak", "no_match", "na"] as const;
export type Verdict = (typeof VERDICTS)[number];

// Structured evidence next to the free-text verdict. Every entry names a
// requirement from the vacancy and, where there is any, the evidence from the
// profile. The groups are the whole point: "related" is not "strong", and
// "unknown" is the default for anything the profile doesn't establish — it only
// becomes a "gap" when the profile contradicts the requirement.
export type AnalysisItem = { requirement: string; evidence?: string; note?: string };
export type Analysis = {
  strong: AnalysisItem[];
  related: AnalysisItem[];
  partial: AnalysisItem[];
  unknown: AnalysisItem[];
  gaps: AnalysisItem[];
  // The vacancy's own vocabulary, as written. Not evidence, not matched.
  terms: string[];
};
export const ANALYSIS_GROUPS = ["strong", "related", "partial", "unknown", "gaps"] as const;
export type AnalysisGroup = (typeof ANALYSIS_GROUPS)[number];

export const STATUSES = [
  "new",
  "in_progress",
  "applied",
  "interview",
  "offer",
  "on_hold",
  "rejected",
  "dropped",
] as const;
export type Status = (typeof STATUSES)[number];

export const CONTRACT_TYPES = [
  "unknown",
  "permanent",
  "fixed_term",
  "secondment",
  "freelance",
  "internship",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const RULE_KINDS = ["knockout", "heavy_negative", "heavy_positive", "open_question"] as const;
export type RuleKind = (typeof RULE_KINDS)[number];

export const FEEDBACK = ["yes", "no", "partly"] as const;
export type Feedback = (typeof FEEDBACK)[number];

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

// One row per vacancy ever looked at, including everything that was dropped.
// There is deliberately no way to delete a row: a rejection with its reason is
// the training data of the whole system.
export const vacancies = sqliteTable("vacancies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employer: text("employer").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  source: text("source"),
  sourceVerified: integer("source_verified", { mode: "boolean" }).notNull().default(false),
  foundOn: text("found_on"),
  assessedOn: text("assessed_on"),

  layer: text("layer", { enum: LAYERS }).notNull().default("na"),
  location: text("location"),
  commuteMinutes: integer("commute_minutes"),
  hours: text("hours"),
  contractType: text("contract_type", { enum: CONTRACT_TYPES }).notNull().default("unknown"),
  officeDays: integer("office_days"),
  remoteNote: text("remote_note"),
  salary: text("salary"),
  languageRequirement: text("language_requirement"),

  verdict: text("verdict", { enum: VERDICTS }).notNull().default("pending"),
  verdictReason: text("verdict_reason"),
  fits: text("fits"),
  fitsNot: text("fits_not"),
  doubts: text("doubts"),
  analysis: text("analysis", { mode: "json" }).$type<Analysis>(),

  status: text("status", { enum: STATUSES }).notNull().default("new"),
  statusNote: text("status_note"),
  appliedOn: text("applied_on"),
  closedOn: text("closed_on"),

  feedbackCorrect: text("feedback_correct", { enum: FEEDBACK }),
  feedbackMissed: text("feedback_missed"),
  feedbackInsight: text("feedback_insight"),

  // A CV made for this vacancy lives in a CV builder (Reactive Resume), not here.
  // Baanjager only keeps the reference, so the assistant can find it again and
  // update it instead of making a second one.
  cvResumeId: text("cv_resume_id"),
  cvUrl: text("cv_url"),
  cvLinkedAt: text("cv_linked_at"),

  vacancyText: text("vacancy_text"),
  ...timestamps,
});

// The decision rules. A rule can point at the vacancy that taught it, which is
// the whole idea: rejections become criteria you can read back later.
export const rules = sqliteTable("rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: RULE_KINDS }).notNull(),
  text: text("text").notNull(),
  rationale: text("rationale"),
  sourceVacancyId: integer("source_vacancy_id").references(() => vacancies.id),
  retiredAt: text("retired_at"),
  ...timestamps,
});

// Pseudonymised profile, one markdown section per key. No name, address, phone
// or email belongs here; matching doesn't need them.
export const profileSections = sqliteTable("profile_sections", {
  key: text("key").primaryKey(),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Where to look, per layer. This is the scan plan an assistant (or you) follows.
export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  layer: text("layer", { enum: LAYERS }).notNull(),
  label: text("label").notNull(),
  url: text("url"),
  note: text("note"),
  cadence: text("cadence"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

// Single-user for now, but modelled as a table so that adding a second account
// later is a feature, not a migration of the auth design.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// Sessions live in the database so they can be revoked: changing the password
// or logging out everywhere deletes rows, and the cookies become worthless.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Vacancy = typeof vacancies.$inferSelect;
export type NewVacancy = typeof vacancies.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type Source = typeof sources.$inferSelect;
