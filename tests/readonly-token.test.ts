import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A second, optional token that can only read. A dashboard gets the numbers
// and nothing else: every method but GET and HEAD is refused with 403, on every
// route, while the full token keeps working exactly as before.

const FULL = "full-token";
const READ = "read-only-token";
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const req = (url: string, init?: RequestInit) => new Request(`http://app.test${url}`, init);
const jsonReq = (url: string, method: string, token: string, body: unknown) =>
  req(url, { method, headers: { ...bearer(token), "Content-Type": "application/json" }, body: JSON.stringify(body) });
const params = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

let dataDir: string;
let routes: {
  summary: typeof import("@/app/api/v1/summary/route");
  vacancies: typeof import("@/app/api/v1/vacancies/route");
  vacancy: typeof import("@/app/api/v1/vacancies/[id]/route");
  sources: typeof import("@/app/api/v1/sources/route");
  source: typeof import("@/app/api/v1/sources/[id]/route");
  profile: typeof import("@/app/api/v1/profile/route");
};

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "baanjager-readonly-"));
  process.env.DATA_DIR = dataDir;
  process.env.API_TOKEN = FULL;
  process.env.API_TOKEN_READONLY = READ;
  routes = {
    summary: await import("@/app/api/v1/summary/route"),
    vacancies: await import("@/app/api/v1/vacancies/route"),
    vacancy: await import("@/app/api/v1/vacancies/[id]/route"),
    sources: await import("@/app/api/v1/sources/route"),
    source: await import("@/app/api/v1/sources/[id]/route"),
    profile: await import("@/app/api/v1/profile/route"),
  };
});

afterAll(() => {
  delete process.env.API_TOKEN_READONLY;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("API_TOKEN_READONLY", () => {
  let vacancyId: number;
  let sourceId: number;

  it("the full token still creates and changes things", async () => {
    const created = await routes.vacancies.POST(jsonReq("/api/v1/vacancies", "POST", FULL, { employer: "Acme", title: "Counsel" }));
    expect(created.status).toBe(201);
    vacancyId = (await created.json()).id;
    const patched = await routes.vacancy.PATCH(jsonReq("/x", "PATCH", FULL, { verdict: "possible" }), params(vacancyId));
    expect(patched.status).toBe(200);
    const source = await routes.sources.POST(jsonReq("/api/v1/sources", "POST", FULL, { layer: "local", label: "Beta board", url: "https://jobs.beta.example" }));
    expect(source.status).toBe(201);
    sourceId = (await source.json()).id;
  });

  it("reads the summary, a list and a single vacancy", async () => {
    const summary = await routes.summary.GET(req("/api/v1/summary", { headers: bearer(READ) }));
    expect(summary.status).toBe(200);
    expect((await summary.json()).total).toBe(1);
    expect((await routes.vacancies.GET(req("/api/v1/vacancies", { headers: bearer(READ) }))).status).toBe(200);
    expect((await routes.vacancy.GET(req("/x", { headers: bearer(READ) }), params(vacancyId))).status).toBe(200);
  });

  it("is refused with 403 for POST, PATCH, PUT and DELETE, and changes nothing", async () => {
    expect((await routes.vacancies.POST(jsonReq("/api/v1/vacancies", "POST", READ, { employer: "Counsel", title: "X" }))).status).toBe(403);
    expect((await routes.vacancy.PATCH(jsonReq("/x", "PATCH", READ, { verdict: "no_match" }), params(vacancyId))).status).toBe(403);
    expect((await routes.profile.PUT(jsonReq("/api/v1/profile", "PUT", READ, { key: "skills", content: "x" }))).status).toBe(403);
    expect((await routes.source.DELETE(req("/x", { method: "DELETE", headers: bearer(READ) }), params(sourceId))).status).toBe(403);

    const after = await (await routes.vacancy.GET(req("/x", { headers: bearer(FULL) }), params(vacancyId))).json();
    expect(after.verdict).toBe("possible");
    const summary = await (await routes.summary.GET(req("/api/v1/summary", { headers: bearer(FULL) }))).json();
    expect(summary.total).toBe(1);
  });

  it("does not open the API on its own and unknown tokens stay 401", async () => {
    expect((await routes.summary.GET(req("/api/v1/summary", { headers: bearer("something-else") }))).status).toBe(401);
    const full = process.env.API_TOKEN;
    delete process.env.API_TOKEN;
    try {
      expect((await routes.summary.GET(req("/api/v1/summary", { headers: bearer(READ) }))).status).toBe(503);
    } finally {
      process.env.API_TOKEN = full;
    }
  });

  it("without the variable a read-only token is just an unknown token", async () => {
    delete process.env.API_TOKEN_READONLY;
    try {
      expect((await routes.summary.GET(req("/api/v1/summary", { headers: bearer(READ) }))).status).toBe(401);
    } finally {
      process.env.API_TOKEN_READONLY = READ;
    }
  });
});
