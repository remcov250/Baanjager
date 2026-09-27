import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import type { Vacancy } from "@/db/schema";
import { vacanciesToCsv } from "@/lib/export";

// A posting is internet content; opened in a spreadsheet, a cell that starts
// with = + - or @ runs as a formula. Every such cell is prefixed with '.
const row = (fields: Partial<Vacancy>) => ({ id: 1, employer: "Acme", title: "Counsel", ...fields }) as Vacancy;

describe("vacanciesToCsv", () => {
  it("escapes a formula on one line", () => {
    const [parsed] = Papa.parse<Record<string, string>>(vacanciesToCsv([row({ title: "=1+1" })]), { header: true }).data;
    expect(parsed.title).toBe("'=1+1");
  });

  it("escapes a formula that continues on the next line", () => {
    const text = '=HYPERLINK("http://x.example","Apply")\nSecond line of the posting';
    const [parsed] = Papa.parse<Record<string, string>>(vacanciesToCsv([row({ vacancyText: text })]), { header: true }).data;
    expect(parsed.vacancy_text).toBe(`'${text}`);
  });

  it("leaves ordinary text alone", () => {
    const [parsed] = Papa.parse<Record<string, string>>(vacanciesToCsv([row({ vacancyText: "Legal counsel\n32 hours" })]), { header: true }).data;
    expect(parsed.vacancy_text).toBe("Legal counsel\n32 hours");
    expect(parsed.title).toBe("Counsel");
  });
});
