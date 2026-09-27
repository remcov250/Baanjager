import { describe, expect, it } from "vitest";
import { prependCheck } from "../mcp/notes.mjs";

// add_check_note writes a dated line on top of the status note. The rest of
// the note is the vacancy's history and must survive untouched.
describe("prependCheck", () => {
  it("puts the check on top and keeps every older line", () => {
    const before = "Check 2026-09-18: still open\nApplied via the form\nDossier: —";
    expect(prependCheck(before, "closed on the employer's site", "2026-09-27")).toBe(
      `Check 2026-09-27: closed on the employer's site\n${before}`,
    );
  });

  it("starts a note when there is none", () => {
    expect(prependCheck(null, "open, 40 applicants", "2026-09-27")).toBe("Check 2026-09-27: open, 40 applicants");
    expect(prependCheck("", "open", "2026-09-27")).toBe("Check 2026-09-27: open");
  });

  it("does not stack the same check twice on one day", () => {
    const once = prependCheck("older line", "open", "2026-09-27");
    expect(prependCheck(once, "open", "2026-09-27")).toBe(once);
  });

  it("trims the note", () => {
    expect(prependCheck(null, "  open  ", "2026-09-27")).toBe("Check 2026-09-27: open");
  });
});
