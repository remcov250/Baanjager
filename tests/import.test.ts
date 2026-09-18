import { describe, expect, it } from "vitest";
import {
  importRows,
  normalizeDate,
  parseCsv,
  parseLayer,
  parseStatus,
  parseVerdict,
  rowToVacancy,
} from "@/lib/import";

describe("normalizeDate", () => {
  it("keeps ISO dates", () => {
    expect(normalizeDate("2026-09-04")).toBe("2026-09-04");
  });
  it("converts Dutch day-month-year", () => {
    expect(normalizeDate("4-9-2026")).toBe("2026-09-04");
    expect(normalizeDate("04/09/2026")).toBe("2026-09-04");
  });
  it("rejects garbage", () => {
    expect(normalizeDate("volgende week")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});

describe("parseLayer", () => {
  it("maps Dutch layer names and pulls the place out of the parentheses", () => {
    expect(parseLayer("Lokaal (Zwolle)")).toEqual({ layer: "local", location: "Zwolle" });
    expect(parseLayer("Ver (Amsterdam)")).toEqual({ layer: "far", location: "Amsterdam" });
    expect(parseLayer("Medium (Düsseldorf/Keulen)")).toEqual({ layer: "medium", location: "Düsseldorf/Keulen" });
  });
  it("takes the first option of a doubtful entry", () => {
    expect(parseLayer("Lokaal/Medium (Eindhoven)").layer).toBe("local");
    expect(parseLayer("Remote/Ver").layer).toBe("remote");
  });
  it("accepts the app's own values and falls back to na", () => {
    expect(parseLayer("far").layer).toBe("far");
    expect(parseLayer("N.v.t.").layer).toBe("na");
    expect(parseLayer("").layer).toBe("na");
  });
});

describe("parseVerdict", () => {
  it("maps Dutch verdicts including annotated ones", () => {
    expect(parseVerdict("Match")).toBe("match");
    expect(parseVerdict("Match (taalrisico geaccepteerd)")).toBe("match");
    expect(parseVerdict("Geen match (opleidingseis genegeerd)")).toBe("no_match");
    expect(parseVerdict("Mogelijk")).toBe("possible");
    expect(parseVerdict("Zwak")).toBe("weak");
    expect(parseVerdict("Nog te beoordelen")).toBe("pending");
  });
  it("passes app values through", () => {
    expect(parseVerdict("no_match")).toBe("no_match");
  });
});

describe("parseStatus", () => {
  it("recognises a received rejection before a generic 'dropped'", () => {
    expect(parseStatus("Afwijzing ontvangen 2026-09-17, positie al gesloten", "Ja", "match")).toBe("rejected");
  });
  it("maps dropped variants", () => {
    expect(parseStatus("Afgevallen (Duits vereist)", "Nee", "no_match")).toBe("dropped");
    expect(parseStatus("Vervallen of listing verwijderd", "Nee", "weak")).toBe("dropped");
    expect(parseStatus("Zwak, geen vervolg voorgesteld", "Nee", "weak")).toBe("dropped");
  });
  it("uses the applied column when the status text is vague", () => {
    expect(parseStatus("Wachten op reactie", "Ja", "match")).toBe("applied");
    expect(parseStatus("", "Ja", "match")).toBe("applied");
    expect(parseStatus("", "On hold", "possible")).toBe("on_hold");
  });
  it("does not mistake preparation notes or thin supply for interviews and offers", () => {
    expect(parseStatus("Verzonden via LinkedIn. Gespreksvoorbereiding staat klaar.", "Ja", "match")).toBe("applied");
    expect(parseStatus("Zwak; alleen bij dun aanbod (hybride-dagen navragen)", "Nee", "weak")).toBe("on_hold");
    expect(parseStatus("Uitgenodigd voor een gesprek op 21-09", "Ja", "match")).toBe("interview");
    expect(parseStatus("Aanbod ontvangen, bedenktijd tot vrijdag", "Ja", "match")).toBe("offer");
  });
  it("maps in-progress and watchlist", () => {
    expect(parseStatus("KLAAR OM TE VERZENDEN. Formulier ingevuld", "Nee", "match")).toBe("in_progress");
    expect(parseStatus("Werkgever op volglijst", "Nee", "possible")).toBe("on_hold");
  });
  it("defaults a no_match without status to dropped, otherwise new", () => {
    expect(parseStatus("", "Nee", "no_match")).toBe("dropped");
    expect(parseStatus("", "Nee", "pending")).toBe("new");
  });
});

describe("rowToVacancy", () => {
  it("maps a Dutch spreadsheet row and keeps the original status text", () => {
    const v = rowToVacancy({
      werkgever: "Acme BV",
      titel: "Project Manager",
      url: "https://example.com/jobs/1",
      bron: "Eigen site",
      datum_gevonden: "2026-09-04",
      laag: "Lokaal (Zwolle)",
      oordeel: "Match",
      reden_kort: "Geen Duits vereist",
      gesolliciteerd: "Ja",
      datum_sollicitatie: "2026-09-05",
      status: "Wachten op reactie",
      dossier: "2026-09-04-acme-project-manager.md",
      vervallen_op: "",
    });
    expect(v).toMatchObject({
      employer: "Acme BV",
      title: "Project Manager",
      layer: "local",
      location: "Zwolle",
      verdict: "match",
      status: "applied",
      appliedOn: "2026-09-05",
      closedOn: null,
    });
    expect(v?.statusNote).toContain("Wachten op reactie");
    expect(v?.statusNote).toContain("Dossier: 2026-09-04-acme-project-manager.md");
  });
  it("rejects a row without employer or title", () => {
    expect(rowToVacancy({ werkgever: "Acme" })).toBeNull();
  });
  it("drops link placeholders that are not http(s)", () => {
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", url: "—" })?.url).toBeNull();
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", link: "n.v.t." })?.url).toBeNull();
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", url: "https://example.com/j" })?.url).toBe("https://example.com/j");
  });
  it("leaves office days empty when the column is blank", () => {
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", kantoordagen: "" })?.officeDays).toBeNull();
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst" })?.officeDays).toBeNull();
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", kantoordagen: "0" })?.officeDays).toBe(0);
    expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", kantoordagen: "3" })?.officeDays).toBe(3);
  });
  it("never turns words about remote work into 0 office days — only an explicit number counts", () => {
    for (const text of ["remote", "fully remote", "volledig remote", "thuis", "hybride", "in overleg"]) {
      expect(rowToVacancy({ werkgever: "Acme", titel: "Analyst", kantoordagen: text })?.officeDays, text).toBeNull();
    }
    // Remote wording in the status column doesn't leak into office days either.
    const v = rowToVacancy({ werkgever: "Acme", titel: "Analyst", status: "Fully remote, wachten op reactie", gesolliciteerd: "Ja" });
    expect(v?.officeDays).toBeNull();
    expect(v?.status).toBe("applied");
  });
});

describe("importRows + parseCsv", () => {
  it("skips duplicates and counts what it added", () => {
    const csv = [
      '"werkgever","titel","laag","oordeel","status"',
      '"Acme","Analyst","Lokaal (Zwolle)","Match","Nieuw"',
      '"Acme","Analyst","Lokaal (Zwolle)","Match","Nieuw"',
      '"Beta","Planner","Ver (Utrecht)","Zwak","Afgevallen"',
      '"","Nobody","",""',
    ].join("\n");
    const inserted: string[] = [];
    const seen = new Set<string>();
    const result = importRows(
      parseCsv(csv),
      (e, t) => seen.has(`${e}|${t}`),
      (v) => {
        seen.add(`${v.employer}|${v.title}`);
        inserted.push(v.employer);
      },
    );
    expect(inserted).toEqual(["Acme", "Beta"]);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(1);
  });
  it("strips a BOM and lowercases headers", () => {
    const rows = parseCsv("﻿Employer,Title\nAcme,Analyst\n");
    expect(rows[0]).toEqual({ employer: "Acme", title: "Analyst" });
  });
});
