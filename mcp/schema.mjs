// The vacancy schema the MCP tools accept. Kept apart from server.mjs, which
// opens the stdio transport as soon as it is imported, so tests can load this
// without starting a server.

import { z } from "zod";

export const LAYERS = ["local", "medium", "far", "remote", "na"];
export const VERDICTS = ["pending", "match", "possible", "uncertain", "weak", "no_match", "na"];
export const STATUSES = ["new", "in_progress", "applied", "interview", "offer", "on_hold", "rejected", "dropped"];
export const CONTRACTS = ["unknown", "permanent", "fixed_term", "secondment", "freelance", "internship"];
export const RULE_KINDS = ["knockout", "heavy_negative", "heavy_positive", "open_question"];
export const FEEDBACK = ["yes", "no", "partly"];
export const PROFILE_KEYS = ["skills", "experience", "education", "requirements", "preferences"];

export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD");

const analysisItem = z.object({
  requirement: z.string().max(200).describe("The requirement as the vacancy words it"),
  evidence: z.string().max(500).optional().describe("The profile fact that supports it — quote or paraphrase, never invent"),
  note: z.string().max(500).optional(),
});

export const analysis = z
  .object({
    strong: z.array(analysisItem).max(30).default([]).describe("Requirement met by the profile as asked"),
    related: z.array(analysisItem).max(30).default([]).describe("Adjacent experience; name what it actually is, never as the requested item"),
    partial: z.array(analysisItem).max(30).default([]).describe("Met in part; say which part"),
    unknown: z.array(analysisItem).max(30).default([]).describe("The profile says nothing about it. This is the default, and it is not a gap"),
    gaps: z.array(analysisItem).max(30).default([]).describe("Only when the profile contradicts the requirement"),
    terms: z.array(z.string().max(80)).max(25).default([]).describe("The vacancy's own vocabulary: technologies, titles, methods, as written"),
  })
  .describe(
    "Structured evidence behind the verdict. Unknown does not mean no: put anything the profile doesn't establish under unknown, and use gaps only for a contradiction.",
  );

export const vacancyFields = {
  employer: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  source: z.string().optional().describe("Where it was found: employer site, LinkedIn, Indeed, recruiter…"),
  sourceVerified: z.boolean().optional().describe("True once confirmed on the employer's own site"),
  foundOn: date,
  assessedOn: date,
  layer: z.enum(LAYERS).optional().describe("Distance layer from the home base"),
  location: z.string().optional(),
  companySummary: z.string().optional().describe("Short note on the employer itself — who they are, what they do. Not scraped by the server; written by whoever assesses the vacancy."),
  commuteMinutes: z.number().int().min(0).max(1440).optional(),
  hours: z.string().optional().describe("e.g. 32-36"),
  contractType: z.enum(CONTRACTS).optional(),
  officeDays: z
    .number()
    .int()
    .min(0)
    .max(7)
    .nullable()
    .optional()
    .describe(
      "Office days per week. null = the posting does not say (put what it does say in remoteNote and ask); 0 = the posting says fully remote. Never write 0 for 'not stated'.",
    ),
  remoteNote: z.string().optional().describe("What the text says about hybrid/remote, in its own words"),
  salary: z.string().optional(),
  languageRequirement: z.string().optional(),
  verdict: z
    .enum(VERDICTS)
    .optional()
    .describe("match = fits as asked; possible = near match with related experience; uncertain = looked at, text doesn't say enough; weak = substantial differences; no_match = a knock-out applies"),
  verdictReason: z.string().optional().describe("The most important field: exactly what clashes, and with which rule"),
  fits: z.string().optional(),
  fitsNot: z.string().optional(),
  doubts: z.string().optional(),
  analysis: analysis.optional(),
  status: z.enum(STATUSES).optional(),
  statusNote: z.string().optional(),
  appliedOn: date,
  closedOn: date,
  feedbackCorrect: z.enum(FEEDBACK).optional().describe("After a rejection or interview: was the verdict right?"),
  feedbackMissed: z.string().optional().describe("What was missed or weighed wrongly"),
  feedbackInsight: z.string().optional().describe("The lesson for the criteria; turn it into a rule with add_rule"),
  vacancyText: z.string().optional().describe("Full posting text"),
};
