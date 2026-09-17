import { describe, expect, it } from "vitest";
import { ruleInput, vacancyInput, vacancyPatch } from "@/lib/validation";

describe("vacancyInput", () => {
  it("requires employer and title", () => {
    expect(vacancyInput.safeParse({}).success).toBe(false);
    expect(vacancyInput.safeParse({ employer: "Acme", title: "Analyst" }).success).toBe(true);
  });
  it("turns empty strings into null and coerces numbers", () => {
    const parsed = vacancyInput.parse({
      employer: "Acme",
      title: "Analyst",
      url: "",
      officeDays: "2",
      commuteMinutes: "",
      sourceVerified: "on",
    });
    expect(parsed.url).toBeNull();
    expect(parsed.officeDays).toBe(2);
    expect(parsed.commuteMinutes).toBeNull();
    expect(parsed.sourceVerified).toBe(true);
  });
  it("rejects invalid enums and bad dates", () => {
    expect(vacancyInput.safeParse({ employer: "A", title: "B", layer: "mars" }).success).toBe(false);
    expect(vacancyInput.safeParse({ employer: "A", title: "B", foundOn: "yesterday" }).success).toBe(false);
    expect(vacancyInput.safeParse({ employer: "A", title: "B", officeDays: 9 }).success).toBe(false);
  });
  it("patch allows partial updates", () => {
    expect(vacancyPatch.safeParse({ status: "applied" }).success).toBe(true);
  });
});

describe("ruleInput", () => {
  it("needs a kind and text", () => {
    expect(ruleInput.safeParse({ kind: "knockout", text: "Driving licence required" }).success).toBe(true);
    expect(ruleInput.safeParse({ kind: "nope", text: "x" }).success).toBe(false);
    expect(ruleInput.safeParse({ kind: "knockout", text: "" }).success).toBe(false);
  });
});
