import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { postingKey } from "@/lib/vacancies";

// The same posting reaches Baanjager under many URLs. A second row for it
// splits the history of one vacancy over two, so the API refuses it and says
// which row already has it.

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

  it("compares other URLs without scheme, www, query, fragment or trailing slash", () => {
    expect(postingKey("https://www.example.com/careers/Legal-Counsel/?utm=x#apply")).toBe("example.com/careers/legal-counsel");
    expect(postingKey("http://example.com/careers/legal-counsel")).toBe("example.com/careers/legal-counsel");
  });

  it("has no key for an empty or malformed link", () => {
    expect(postingKey(null)).toBeNull();
    expect(postingKey("")).toBeNull();
    expect(postingKey("not a url")).toBeNull();
  });
});

const TOKEN = "test-token";
const auth = { Authorization: `Bearer ${TOKEN}` };
const post = (query: string, body: unknown) =>
  new Request(`http://app.test/api/v1/vacancies${query}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let dataDir: string;
let route: typeof import("@/app/api/v1/vacancies/route");

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "baanjager-dupes-"));
  process.env.DATA_DIR = dataDir;
  process.env.API_TOKEN = TOKEN;
  route = await import("@/app/api/v1/vacancies/route");
});

afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

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
