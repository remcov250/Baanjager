import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("have the same keys in both languages", () => {
    const a = keys(nl).sort();
    const b = keys(en).sort();
    expect(a).toEqual(b);
  });
  it("have no empty strings", () => {
    for (const dict of [nl, en]) {
      const empty = keys(dict).filter((k) => {
        const value = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], dict);
        return value === "";
      });
      expect(empty).toEqual([]);
    }
  });
});
