#!/usr/bin/env node
// MCP server for Baanjager. Speaks stdio to the assistant and REST to the app,
// so it runs anywhere the app is reachable — the same machine, another host on
// your network, or over a VPN. Nothing here touches the database directly.
//
//   BAANJAGER_URL=http://localhost:3000 BAANJAGER_TOKEN=... node mcp/server.mjs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { wrapPaths } from "./untrusted.mjs";

const BASE = (process.env.BAANJAGER_URL || "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.BAANJAGER_TOKEN;

if (!TOKEN) {
  console.error("BAANJAGER_TOKEN is not set; the API will refuse every call.");
}

const LAYERS = ["local", "medium", "far", "remote", "na"];
const VERDICTS = ["pending", "match", "possible", "uncertain", "weak", "no_match", "na"];
const STATUSES = ["new", "in_progress", "applied", "interview", "offer", "on_hold", "rejected", "dropped"];
const CONTRACTS = ["unknown", "permanent", "fixed_term", "secondment", "freelance", "internship"];
const RULE_KINDS = ["knockout", "heavy_negative", "heavy_positive", "open_question"];
const FEEDBACK = ["yes", "no", "partly"];
const PROFILE_KEYS = ["skills", "experience", "education", "requirements", "preferences"];

async function api(method, path, body) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

const text = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

// Free text in a vacancy row is internet content. Fence it before it reaches the
// assistant so an instruction hidden in a posting reads as data.
const VACANCY_UNTRUSTED = ["vacancyText", "verdictReason", "fits", "fitsNot", "doubts", "companySummary", "statusNote", "feedbackMissed", "feedbackInsight", "analysis"];

const server = new McpServer({ name: "baanjager", version: "0.2.0" });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD");

const analysisItem = z.object({
  requirement: z.string().max(200).describe("The requirement as the vacancy words it"),
  evidence: z.string().max(500).optional().describe("The profile fact that supports it — quote or paraphrase, never invent"),
  note: z.string().max(500).optional(),
});

const analysis = z
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

const vacancyFields = {
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
  officeDays: z.number().int().min(0).max(7).optional().describe("Office days per week"),
  remoteNote: z.string().optional().describe("What the text says about hybrid/remote"),
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

server.registerTool(
  "get_summary",
  {
    description:
      "Start here. Counts per status, vacancies still awaiting a verdict, open applications, on-hold items and the most recently updated rows.",
    inputSchema: {},
  },
  async () => text(await api("GET", "/summary")),
);

server.registerTool(
  "list_vacancies",
  {
    description:
      "List vacancies without their long text fields. By default excludes dropped and rejected ones; pass closed=true to include them. Use get_vacancy for the full posting text.",
    inputSchema: {
      q: z.string().optional().describe("Search employer or title"),
      layer: z.enum(LAYERS).optional(),
      verdict: z.enum(VERDICTS).optional(),
      status: z.enum(STATUSES).optional(),
      closed: z.boolean().optional(),
    },
  },
  async (args) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== "") params.set(k, String(v === true ? 1 : v));
    }
    return text(await api("GET", `/vacancies?${params}`));
  },
);

server.registerTool(
  "get_vacancy",
  {
    description: "Full detail of one vacancy, including the rules that were learned from it.",
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => text(wrapPaths(await api("GET", `/vacancies/${id}`), VACANCY_UNTRUSTED)),
);

server.registerTool(
  "add_vacancy",
  {
    description:
      "Add a vacancy. Check list_vacancies first so the same posting isn't added twice. A verdict without a verdictReason is not useful — always explain what clashes.",
    inputSchema: { ...vacancyFields, employer: z.string(), title: z.string() },
  },
  async (args) => text(await api("POST", "/vacancies", args)),
);

server.registerTool(
  "update_vacancy",
  {
    description: "Update any fields of a vacancy. Use set_status for plain status changes.",
    inputSchema: { id: z.number().int().positive(), ...vacancyFields },
  },
  async ({ id, ...fields }) => text(await api("PATCH", `/vacancies/${id}`, fields)),
);

server.registerTool(
  "set_status",
  {
    description:
      "Change the status of a vacancy and say what happened. Vacancies are never deleted: use 'dropped' with a note instead.",
    inputSchema: {
      id: z.number().int().positive(),
      status: z.enum(STATUSES),
      note: z.string().optional().describe("What exactly happened, with a date if relevant"),
      appliedOn: date,
      closedOn: date,
    },
  },
  async ({ id, status, note, appliedOn, closedOn }) => {
    const current = await api("GET", `/vacancies/${id}`);
    const stamp = new Date().toISOString().slice(0, 10);
    const statusNote = note
      ? [current.statusNote, `${stamp}: ${note}`].filter(Boolean).join("\n")
      : current.statusNote;
    return text(await api("PATCH", `/vacancies/${id}`, { status, statusNote, appliedOn, closedOn }));
  },
);

server.registerTool(
  "list_rules",
  {
    description:
      "The criteria: knock-outs, strong negatives, strong positives and open questions. Read these before assessing anything.",
    inputSchema: { includeRetired: z.boolean().optional() },
  },
  async ({ includeRetired }) => text(await api("GET", `/rules${includeRetired ? "?retired=1" : ""}`)),
);

server.registerTool(
  "add_rule",
  {
    description:
      "Add a criterion, ideally linked to the vacancy that taught it. This is how a rejection becomes a rule.",
    inputSchema: {
      kind: z.enum(RULE_KINDS),
      text: z.string(),
      rationale: z.string().optional(),
      sourceVacancyId: z.number().int().positive().optional(),
    },
  },
  async (args) => text(await api("POST", "/rules", args)),
);

server.registerTool(
  "get_profile",
  {
    description: "The pseudonymised profile: skills, experience, education, hard requirements, preferences, home base.",
    inputSchema: {},
  },
  async () => text(await api("GET", "/profile")),
);

server.registerTool(
  "update_profile_section",
  {
    description: "Replace one profile section. Never put a name, address, phone number or email in here.",
    inputSchema: { key: z.enum(PROFILE_KEYS), content: z.string() },
  },
  async (args) => text(await api("PUT", "/profile", args)),
);

server.registerTool(
  "get_scan_plan",
  {
    description: "Where to search, per layer, with notes and cadence. Walk through these for a scan.",
    inputSchema: {},
  },
  async () => text(await api("GET", "/sources?active=1")),
);

server.registerTool(
  "get_cv_context",
  {
    description:
      "Everything a CV builder needs for one vacancy: the posting, the assessment with its structured evidence, the candidate's skills/experience/education, and whether a CV already exists for it (cv). " +
      "Use it when the person asks for a CV for a vacancy, then build or update the CV in the CV builder (e.g. Reactive Resume's own MCP tools) and record the result with link_cv. " +
      "If cv is not null, update that resume instead of creating another. Follow the policy field: evidence only, unknown is not a gap, never invent experience.",
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => {
    const context = await api("GET", `/vacancies/${id}/context`);
    return text(wrapPaths(context, context.untrusted ?? []));
  },
);

server.registerTool(
  "link_cv",
  {
    description:
      "Record which CV in the CV builder belongs to a vacancy, so the next session finds it instead of making a second one. Idempotent: the same resumeId again changes nothing. Pass resumeId null to remove the link.",
    inputSchema: {
      id: z.number().int().positive(),
      resumeId: z.string().max(200).nullable().describe("The resume's id in the CV builder"),
      url: z.string().max(2000).optional().describe("Where the person can open it (http/https)"),
    },
  },
  async ({ id, resumeId, url }) => text(await api("PUT", `/vacancies/${id}/cv`, { resumeId, url })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
