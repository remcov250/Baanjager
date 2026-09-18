#!/usr/bin/env node
// MCP server for Baanjager. Speaks stdio to the assistant and REST to the app,
// so it runs anywhere the app is reachable — the same machine, another host on
// your network, or over a VPN. Nothing here touches the database directly.
//
//   BAANJAGER_URL=http://localhost:3000 BAANJAGER_TOKEN=... node mcp/server.mjs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LAYERS, PROFILE_KEYS, RULE_KINDS, STATUSES, VERDICTS, date, vacancyFields } from "./schema.mjs";
import { wrapPaths } from "./untrusted.mjs";

const BASE = (process.env.BAANJAGER_URL || "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.BAANJAGER_TOKEN;

if (!TOKEN) {
  console.error("BAANJAGER_TOKEN is not set; the API will refuse every call.");
}

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
