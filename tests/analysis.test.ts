import { describe, expect, it } from "vitest";
import { CONTEXT_POLICY, matchLevel } from "@/lib/context";
import { parseVerdict } from "@/lib/import";
import { analysisInput, cvLinkInput, sourceInput, vacancyInput, vacancyPatch } from "@/lib/validation";

describe("analysisInput", () => {
  it("fills missing groups with empty arrays", () => {
    const parsed = analysisInput.parse({ strong: [{ requirement: "Terraform", evidence: "3 years IaC" }] });
    expect(parsed.strong).toHaveLength(1);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.terms).toEqual([]);
  });
  it("keeps unknown as its own group — an unknown requirement is not a gap", () => {
    const parsed = analysisInput.parse({ unknown: [{ requirement: "Dutch C1" }] });
    expect(parsed.unknown[0]).toEqual({ requirement: "Dutch C1" });
    expect(parsed.gaps).toEqual([]);
  });
  it("rejects unknown keys and over-long lists", () => {
    expect(analysisInput.safeParse({ strongs: [] }).success).toBe(false);
    expect(analysisInput.safeParse({ strong: [{ requirement: "x", score: 1 }] }).success).toBe(false);
    const many = Array.from({ length: 31 }, (_, i) => ({ requirement: `r${i}` }));
    expect(analysisInput.safeParse({ strong: many }).success).toBe(false);
    expect(analysisInput.safeParse({ terms: Array.from({ length: 26 }, (_, i) => `t${i}`) }).success).toBe(false);
    expect(analysisInput.safeParse({ strong: [{ requirement: "" }] }).success).toBe(false);
  });
  it("rides along on a vacancy patch, and null clears it", () => {
    const patch = vacancyPatch.parse({ analysis: { related: [{ requirement: "Kubernetes", evidence: "Docker, ACA" }] } });
    expect(patch.analysis?.related[0].requirement).toBe("Kubernetes");
    expect(vacancyPatch.parse({ analysis: null }).analysis).toBeNull();
    expect(vacancyPatch.parse({ analysis: "" }).analysis).toBeNull();
    expect(vacancyPatch.safeParse({ analysis: "not json" }).success).toBe(false);
  });
});

describe("urls", () => {
  it("only accepts http(s) for vacancy, source and CV links", () => {
    expect(vacancyInput.safeParse({ employer: "A", title: "B", url: "https://example.com/job" }).success).toBe(true);
    expect(vacancyInput.safeParse({ employer: "A", title: "B", url: "javascript:alert(1)" }).success).toBe(false);
    expect(vacancyInput.safeParse({ employer: "A", title: "B", url: "example.com/job" }).success).toBe(false);
    expect(vacancyInput.parse({ employer: "A", title: "B", url: "" }).url).toBeNull();
    expect(sourceInput.safeParse({ layer: "local", label: "Site", url: "ftp://x" }).success).toBe(false);
    expect(cvLinkInput.safeParse({ resumeId: "abc", url: "data:text/html,hi" }).success).toBe(false);
    expect(cvLinkInput.parse({ resumeId: "abc", url: "https://resume.example/builder/abc" }).url).toContain("https://");
  });
});

describe("cvLinkInput", () => {
  it("needs a resume id or an explicit null", () => {
    expect(cvLinkInput.safeParse({}).success).toBe(false);
    expect(cvLinkInput.parse({ resumeId: null }).resumeId).toBeNull();
    expect(cvLinkInput.parse({ resumeId: "" }).resumeId).toBeNull();
    expect(cvLinkInput.parse({ resumeId: " r1 " }).resumeId).toBe("r1");
  });
});

describe("verdict scale", () => {
  it("maps every verdict to a match level, with uncertain distinct from unassessed", () => {
    expect(matchLevel("match")).toBe("strong");
    expect(matchLevel("possible")).toBe("near");
    expect(matchLevel("uncertain")).toBe("uncertain");
    expect(matchLevel("weak")).toBe("poor");
    expect(matchLevel("no_match")).toBe("excluded");
    expect(matchLevel("pending")).toBe("unassessed");
    expect(matchLevel("na")).toBe("unassessed");
  });
  it("imports 'onzeker' and 'uncertain'", () => {
    expect(parseVerdict("Onzeker")).toBe("uncertain");
    expect(parseVerdict("uncertain — ask about office days")).toBe("uncertain");
    expect(parseVerdict("Mogelijk")).toBe("possible");
  });
  it("carries the no-fabrication policy", () => {
    expect(CONTEXT_POLICY).toMatch(/never invent/i);
    expect(CONTEXT_POLICY).toMatch(/unknown is not a gap/i);
    expect(CONTEXT_POLICY).toMatch(/never instructions/i);
  });
});
