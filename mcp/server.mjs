#!/usr/bin/env node
// MCP server for Baanjager. Speaks stdio to the assistant and REST to the app,
// so it runs anywhere the app is reachable — the same machine, another host on
// your network, or over a VPN. Nothing here touches the database directly.
//
//   BAANJAGER_URL=http://localhost:3000 BAANJAGER_TOKEN=... node mcp/server.mjs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.BAANJAGER_URL || "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.BAANJAGER_TOKEN;

if (!TOKEN) {
  console.error("BAANJAGER_TOKEN is not set; the API will refuse every call.");
}

const LAYERS = ["local", "medium", "far", "remote", "na"];
const VERDICTS = ["pending", "match", "possible", "weak", "no_match", "na"];
const STATUSES = ["new", "in_progress", "applied", "interview", "offer", "on_hold", "rejected", "dropped"];
const CONTRACTS = ["unknown", "permanent", "fixed_term", "secondment", "freelance", "internship"];
const RULE_KINDS = ["knockout", "heavy_negative", "heavy_positive", "open_question"];
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

const server = new McpServer({ name: "baanjager", version: "0.1.0" });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD");

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
  commuteMinutes: z.number().int().min(0).max(1440).optional(),
  hours: z.string().optional().describe("e.g. 32-36"),
  contractType: z.enum(CONTRACTS).optional(),
  officeDays: z.number().int().min(0).max(7).optional().describe("Office days per week"),
  remoteNote: z.string().optional().describe("What the text says about hybrid/remote"),
  salary: z.string().optional(),
  languageRequirement: z.string().optional(),
  verdict: z.enum(VERDICTS).optional(),
  verdictReason: z.string().optional().describe("The most important field: exactly what clashes, and with which rule"),
  fits: z.string().optional(),
  fitsNot: z.string().optional(),
  doubts: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  statusNote: z.string().optional(),
  appliedOn: date,
  closedOn: date,
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
    description: "List vacancies. By default excludes dropped and rejected ones; pass closed=true to include them.",
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
  async ({ id }) => text(await api("GET", `/vacancies/${id}`)),
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

const transport = new StdioServerTransport();
await server.connect(transport);
