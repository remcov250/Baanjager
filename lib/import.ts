import Papa from "papaparse";
import {
  LAYERS,
  STATUSES,
  VERDICTS,
  type Layer,
  type NewVacancy,
  type Status,
  type Verdict,
} from "@/db/schema";
import { isHttpUrl } from "@/lib/validation";

// Pure mapping from a CSV row to a vacancy. Accepts the app's own export
// columns and, because the first user had a Dutch spreadsheet, their Dutch
// equivalents too. Everything here is testable without a database.

const ALIASES: Record<string, string[]> = {
  employer: ["employer", "werkgever"],
  title: ["title", "titel", "functie"],
  url: ["url", "link"],
  source: ["source", "bron"],
  found_on: ["found_on", "datum_gevonden", "gevonden"],
  layer: ["layer", "laag"],
  location: ["location", "locatie", "plaats"],
  verdict: ["verdict", "oordeel"],
  verdict_reason: ["verdict_reason", "reden_kort", "reden"],
  applied: ["applied", "gesolliciteerd"],
  applied_on: ["applied_on", "datum_sollicitatie"],
  status: ["status"],
  status_note: ["status_note", "toelichting"],
  closed_on: ["closed_on", "vervallen_op", "gesloten_op"],
  dossier: ["dossier"],
  hours: ["hours", "uren"],
  contract_type: ["contract_type", "contractvorm"],
  office_days: ["office_days", "kantoordagen"],
  salary: ["salary", "salaris"],
  vacancy_text: ["vacancy_text", "vacaturetekst"],
};

export type RawRow = Record<string, string | undefined>;

function pick(row: RawRow, field: string): string {
  for (const alias of ALIASES[field] ?? [field]) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

export function normalizeDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

// "Lokaal (Zwolle)" → local + Zwolle; "Medium/Remote" → medium; "Ver" → far.
export function parseLayer(value: string): { layer: Layer; location: string | null } {
  const raw = value.trim();
  const location = raw.match(/\(([^)]+)\)/)?.[1]?.trim() ?? null;
  const head = raw.split(/[\/(]/)[0].trim().toLowerCase();
  const map: Record<string, Layer> = {
    lokaal: "local",
    local: "local",
    medium: "medium",
    ver: "far",
    far: "far",
    remote: "remote",
    "n.v.t.": "na",
    nvt: "na",
    na: "na",
    "n/a": "na",
  };
  if ((LAYERS as readonly string[]).includes(head)) return { layer: head as Layer, location };
  return { layer: map[head] ?? "na", location };
}

export function parseVerdict(value: string): Verdict {
  const v = value.trim().toLowerCase();
  if (!v) return "pending";
  if ((VERDICTS as readonly string[]).includes(v)) return v as Verdict;
  if (v.startsWith("geen match") || v.startsWith("no match")) return "no_match";
  if (v.startsWith("match")) return "match";
  if (v.startsWith("mogelijk") || v.startsWith("possible")) return "possible";
  if (v.startsWith("onzeker") || v.startsWith("uncertain")) return "uncertain";
  if (v.startsWith("zwak") || v.startsWith("weak")) return "weak";
  if (v.startsWith("nog te") || v.startsWith("pending")) return "pending";
  if (v.startsWith("n.v.t") || v === "na" || v === "n/a") return "na";
  return "pending";
}

// Free-text status columns are where the real story lives; the mapped enum is
// a best effort, and the original text is preserved in status_note.
export function parseStatus(statusText: string, applied: string, verdict: Verdict): Status {
  const s = statusText.trim().toLowerCase();
  if ((STATUSES as readonly string[]).includes(s)) return s as Status;
  const a = applied.trim().toLowerCase();

  if (s.includes("afwijzing ontvangen") || s.startsWith("afgewezen") || s.startsWith("rejected")) {
    return "rejected";
  }
  if (s.startsWith("afgevallen") || s.includes("vervallen") || s.includes("geen vervolg") || s.startsWith("dropped")) {
    return "dropped";
  }
  // "gesprek" alone is too loose: "gespreksvoorbereiding staat klaar" belongs to an application
  // that was merely sent, and "aanbod" in "alleen bij dun aanbod" is the supply of vacancies,
  // not a job offer. Only the phrasings that actually mean an interview or an offer count.
  if (/uitgenodigd|gesprek (op|gepland|ingepland|staat)|gespreksronde (op|gepland)|interview (scheduled|invite|on )/.test(s)) {
    return "interview";
  }
  if (/aanbod (ontvangen|gekregen)|offer (received|made|accepted)|job offer/.test(s)) return "offer";
  if (s.startsWith("verzonden") || s.includes("wachten op reactie") || a === "ja" || a === "yes") {
    return "applied";
  }
  if (
    s.includes("on hold") || a === "on hold" || s.includes("volglijst") || s.includes("watchlist") ||
    s.includes("dun aanbod")
  ) {
    return "on_hold";
  }
  if (s.includes("klaar om te verzenden") || s.startsWith("actief") || s.includes("bezig")) {
    return "in_progress";
  }
  if (verdict === "no_match") return "dropped";
  return "new";
}

export function rowToVacancy(row: RawRow): NewVacancy | null {
  const employer = pick(row, "employer");
  const title = pick(row, "title");
  if (!employer || !title) return null;

  const { layer, location } = parseLayer(pick(row, "layer"));
  const verdict = parseVerdict(pick(row, "verdict"));
  const statusText = pick(row, "status");
  const status = parseStatus(statusText, pick(row, "applied"), verdict);

  const noteParts = [statusText];
  const dossier = pick(row, "dossier");
  if (dossier) noteParts.push(`Dossier: ${dossier}`);
  const explicitNote = pick(row, "status_note");
  if (explicitNote) noteParts.unshift(explicitNote);

  // Number("") is 0, which would turn an empty column into "0 office days".
  const officeDaysText = pick(row, "office_days");
  const officeDays = officeDaysText ? Number(officeDaysText) : NaN;

  // Spreadsheets fill an empty link cell with "—" or "n.v.t."; only a real
  // http(s) address is worth keeping as a link.
  const url = pick(row, "url");

  return {
    employer,
    title,
    url: isHttpUrl(url) ? url : null,
    source: pick(row, "source") || null,
    foundOn: normalizeDate(pick(row, "found_on")),
    layer,
    location: pick(row, "location") || location,
    hours: pick(row, "hours") || null,
    officeDays: Number.isInteger(officeDays) && officeDays >= 0 && officeDays <= 7 ? officeDays : null,
    salary: pick(row, "salary") || null,
    verdict,
    verdictReason: pick(row, "verdict_reason") || null,
    status,
    statusNote: noteParts.filter(Boolean).join("\n") || null,
    appliedOn: normalizeDate(pick(row, "applied_on")),
    closedOn: normalizeDate(pick(row, "closed_on")),
    vacancyText: pick(row, "vacancy_text") || null,
  };
}

export function parseCsv(text: string): RawRow[] {
  const result = Papa.parse<RawRow>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return result.data;
}

export type ImportResult = { added: number; skipped: number; errors: string[] };

export function importRows(
  rows: RawRow[],
  exists: (employer: string, title: string) => boolean,
  insert: (vacancy: NewVacancy) => void,
): ImportResult {
  const result: ImportResult = { added: 0, skipped: 0, errors: [] };
  rows.forEach((row, index) => {
    const vacancy = rowToVacancy(row);
    if (!vacancy) {
      result.skipped += 1;
      result.errors.push(`row ${index + 2}: missing employer or title`);
      return;
    }
    if (exists(vacancy.employer, vacancy.title)) {
      result.skipped += 1;
      return;
    }
    insert(vacancy);
    result.added += 1;
  });
  return result;
}
