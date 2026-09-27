import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The same posting reaches Baanjager under many URLs. A second row for it
// splits the history of one vacancy over two, so the API refuses it and says
// which row already has it.

const TOKEN = "test-token";

// lib/db reads DATA_DIR when it is first imported, so everything that reaches
// it is imported only after the temp directory is set. A static import would
// write into ./data and collide with itself on the next run.
let dataDir: string;
let postingKey: typeof import("@/lib/vacancies").postingKey;
let route: typeof import("@/app/api/v1/vacancies/route");

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "baanjager-dupes-"));
  process.env.DATA_DIR = dataDir;
  process.env.API_TOKEN = TOKEN;
  ({ postingKey } = await import("@/lib/vacancies"));
  route = await import("@/app/api/v1/vacancies/route");
});

afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe("postingKey", () => {
  it("reduces every LinkedIn URL for one job to its numeric id", () => {
    const urls = [
      "https://www.linkedin.com/jobs/view/4467292898/",
      "https://nl.linkedin.com/jobs/view/legal-counsel-netherlands-at-acme-4467292898",
      "https://de.linkedin.com/jobs/view/legal-counsel-at-acme-4467292898?trk=public_jobs&refId=x",
      "http://linkedin.com/jobs/view/4467292898",
    ];
    for (const url of urls) expect(postingKey(url)).toBe("linkedin:4467292898");
  });

  it("keeps two different LinkedIn jobs apart", () => {
    expect(postingKey("https://nl.linkedin.com/jobs/view/counsel-at-acme-4467292898")).not.toBe(
      postingKey("https://nl.linkedin.com/jobs/view/counsel-at-acme-4467292899"),
    );
  });

  it("reads the job id from a LinkedIn search or collection link", () => {
    expect(postingKey("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4467292898&trk=x")).toBe(
      "linkedin:4467292898",
    );
  });

  it("keeps a job id that lives in the query, so two jobs on one board stay apart", () => {
    const first = postingKey("https://nl.indeed.com/viewjob?jk=abc123&from=serp");
    expect(first).not.toBe(postingKey("https://nl.indeed.com/viewjob?jk=def456&from=serp"));
    expect(first).toBe(postingKey("https://nl.indeed.com/viewjob?from=serp&jk=abc123&utm_source=mail"));
  });

  it("compares other URLs without scheme, www, tracking parameters, fragment or trailing slash", () => {
    expect(postingKey("https://www.example.com/careers/Legal-Counsel/?utm=x#apply")).toBe("example.com/careers/legal-counsel");
    expect(postingKey("http://example.com/careers/legal-counsel")).toBe("example.com/careers/legal-counsel");
  });

  it("has no key for an empty or malformed link", () => {
    expect(postingKey(null)).toBeNull();
    expect(postingKey("")).toBeNull();
    expect(postingKey("not a url")).toBeNull();
  });
});

const auth = { Authorization: `Bearer ${TOKEN}` };
const post = (query: string, body: unknown) =>
  new Request(`http://app.test/api/v1/vacancies${query}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });


describe("POST /api/v1/vacancies with a posting that is already there", () => {
  it("refuses the second row and names the first", async () => {
    const first = await route.POST(post("", { employer: "Acme", title: "Legal Counsel", url: "https://nl.linkedin.com/jobs/view/legal-counsel-at-acme-4400000001" }));
    expect(first.status).toBe(201);
    const { id } = await first.json();

    const again = await route.POST(post("", { employer: "Acme BV", title: "Legal Counsel (m/f/d)", url: "https://www.linkedin.com/jobs/view/4400000001/" }));
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "duplicate", existing: { id, employer: "Acme", title: "Legal Counsel" } });
  });

  it("lets a caller override when one page really lists two roles", async () => {
    const url = "https://careers.beta.example/jobs/legal";
    expect((await route.POST(post("", { employer: "Beta", title: "Counsel A", url }))).status).toBe(201);
    expect((await route.POST(post("", { employer: "Beta", title: "Counsel B", url }))).status).toBe(409);
    expect((await route.POST(post("?allowDuplicate=1", { employer: "Beta", title: "Counsel B", url }))).status).toBe(201);
  });

  it("never blocks a vacancy without a link", async () => {
    expect((await route.POST(post("", { employer: "Counsel", title: "No link" }))).status).toBe(201);
    expect((await route.POST(post("", { employer: "Counsel", title: "No link" }))).status).toBe(201);
  });

  it("finds a row by its LinkedIn id through the search", async () => {
    const res = await route.GET(new Request("http://app.test/api/v1/vacancies?q=4400000001", { headers: auth }));
    const rows = await res.json();
    expect(rows.map((r: { employer: string }) => r.employer)).toEqual(["Acme"]);
  });
});

describe("two jobs on a board that keeps the id in the query", () => {
  it("are two vacancies, and the same one again is refused", async () => {
    const a = "https://nl.indeed.example/viewjob?jk=aaa111";
    const b = "https://nl.indeed.example/viewjob?jk=bbb222";
    expect((await route.POST(post("", { employer: "Acme", title: "Paralegal", url: a }))).status).toBe(201);
    expect((await route.POST(post("", { employer: "Acme", title: "Paralegal", url: b }))).status).toBe(201);
    expect((await route.POST(post("", { employer: "Acme", title: "Paralegal", url: `${a}&utm_source=mail` }))).status).toBe(409);
  });
});

describe("search", () => {
  it("treats % and _ as plain characters", async () => {
    const { listVacancySummaries } = await import("@/lib/vacancies");
    await route.POST(post("", { employer: "Beta", title: "senior_dev" }));
    await route.POST(post("", { employer: "Beta", title: "seniorXdev" }));
    const titles = listVacancySummaries({ q: "senior_dev" }).map((v) => v.title);
    expect(titles).toEqual(["senior_dev"]);
  });
});

describe("CSV import against the database", () => {
  it("keeps two postings with the same title apart by link and skips a repeat", async () => {
    const { importVacanciesCsv } = await import("@/lib/vacancies");
    const csv = [
      "employer,title,url",
      "Gamma,Jurist,https://careers.gamma.example/jobs/1",
      "Gamma,Jurist,https://careers.gamma.example/jobs/2",
      "Gamma,Jurist,https://careers.gamma.example/jobs/1/",
      "Gamma,Paralegal,",
      "Gamma,Paralegal,",
    ].join("\n");
    const result = importVacanciesCsv(csv);
    expect(result.added).toBe(3);
    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch(/^row 4: already there as #\d+$/);
  });

  it("refuses a file with a broken quote and adds nothing", async () => {
    const { importVacanciesCsv, listVacancySummaries } = await import("@/lib/vacancies");
    const before = listVacancySummaries({ closed: true }).length;
    const result = importVacanciesCsv('employer,title\n"Delta,Jurist\nEpsilon,Jurist\n');
    expect(result).toMatchObject({ added: 0, rejected: true });
    expect(listVacancySummaries({ closed: true })).toHaveLength(before);
  });
});
