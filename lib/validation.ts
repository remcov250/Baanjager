import { z } from "zod";
import {
  CONTRACT_TYPES,
  FEEDBACK,
  LAYERS,
  RULE_KINDS,
  STATUSES,
  VERDICTS,
} from "@/db/schema";

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const text = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

// URLs are rendered as links, so only http(s) may go in; "javascript:" and
// friends are rejected rather than escaped.
export const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const httpUrl = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).refine(isHttpUrl, "expected an http(s) URL").nullable().optional(),
  );

// The shape alone lets "2026-02-30" through (Date.parse rolls it into March);
// round-tripping through a UTC date catches that.
const isRealDate = (value: string) => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

const isoDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .refine(isRealDate, "not a calendar date")
    .nullable()
    .optional(),
);

const smallInt = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().int().min(min).max(max).nullable().optional(),
  );

const checkbox = z.preprocess(
  (value) => value === true || value === "on" || value === "true" || value === "1",
  z.boolean(),
);

// The structured evidence behind a verdict (see Analysis in db/schema.ts). Caps
// keep it a summary, not a dump: 30 items per group, 25 terms. Unknown keys are
// rejected so a typo ("strongs") doesn't silently vanish.
const analysisItem = z
  .object({
    requirement: z.string().trim().min(1).max(200),
    evidence: z.string().trim().max(500).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const analysisGroup = z.array(analysisItem).max(30).default([]);

export const analysisInput = z
  .object({
    strong: analysisGroup,
    related: analysisGroup,
    partial: analysisGroup,
    unknown: analysisGroup,
    gaps: analysisGroup,
    terms: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  })
  .strict();

export type AnalysisInput = z.infer<typeof analysisInput>;

export const vacancyInput = z.object({
  employer: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  url: httpUrl(2000),
  source: text(200),
  sourceVerified: checkbox.optional(),
  foundOn: isoDate,
  assessedOn: isoDate,

  layer: z.enum(LAYERS).optional(),
  location: text(200),
  companySummary: text(2000),
  commuteMinutes: smallInt(0, 1440),
  hours: text(50),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  officeDays: smallInt(0, 7),
  remoteNote: text(500),
  salary: text(200),
  languageRequirement: text(300),

  verdict: z.enum(VERDICTS).optional(),
  verdictReason: text(5000),
  fits: text(5000),
  fitsNot: text(5000),
  doubts: text(5000),
  // Not a form field: the assistant writes it over the API, the person edits
  // the prose. Absent from FormData, so a form save never touches it.
  analysis: z.preprocess(emptyToNull, analysisInput.nullable().optional()),

  status: z.enum(STATUSES).optional(),
  statusNote: text(5000),
  appliedOn: isoDate,
  closedOn: isoDate,

  feedbackCorrect: z.preprocess(emptyToNull, z.enum(FEEDBACK).nullable().optional()),
  feedbackMissed: text(5000),
  feedbackInsight: text(5000),

  vacancyText: text(100_000),
});

export type VacancyInput = z.infer<typeof vacancyInput>;
export const vacancyPatch = vacancyInput.partial();

export const ruleInput = z.object({
  kind: z.enum(RULE_KINDS),
  text: z.string().trim().min(1).max(1000),
  rationale: text(5000),
  sourceVacancyId: smallInt(1, 2_147_483_647),
});

// The reference to a CV in the CV builder. resumeId null clears the link.
export const cvLinkInput = z.object({
  resumeId: z.preprocess(emptyToNull, z.string().trim().min(1).max(200).nullable()),
  url: httpUrl(2000),
});

export const sourceInput = z.object({
  layer: z.enum(LAYERS),
  label: z.string().trim().min(1).max(200),
  url: httpUrl(2000),
  note: text(2000),
  cadence: text(100),
  active: checkbox.optional(),
});

export const sourcePatch = sourceInput.partial();

export const PROFILE_KEYS = [
  "skills",
  "experience",
  "education",
  "requirements",
  "preferences",
] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

export const profileInput = z.object({
  key: z.enum(PROFILE_KEYS),
  content: z.string().max(50_000),
});

// Everything a form posts is a string; this turns FormData into the plain
// object the zod schemas expect, without pulling in unrelated fields.
export function formToObject(formData: FormData, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (formData.has(key)) out[key] = formData.get(key);
  }
  return out;
}

export const VACANCY_FIELDS = Object.keys(vacancyInput.shape) as (keyof VacancyInput)[];
