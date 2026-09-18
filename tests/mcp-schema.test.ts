import { describe, expect, it } from "vitest";
import { z } from "zod";
import { vacancyFields } from "../mcp/schema.mjs";

// The MCP tools are the assistant's write path. officeDays has three states
// and the schema must let all three through: a number, null ("the posting
// doesn't say") and absent ("leave it alone").
const patch = z.object(vacancyFields);

describe("MCP vacancy schema: officeDays", () => {
  it("accepts a number of days", () => {
    expect(patch.parse({ officeDays: 2 }).officeDays).toBe(2);
    expect(patch.parse({ officeDays: 0 }).officeDays).toBe(0);
  });
  it("accepts null for 'not stated'", () => {
    expect(patch.parse({ officeDays: null }).officeDays).toBeNull();
  });
  it("leaves the field out when it is not sent", () => {
    expect("officeDays" in patch.parse({ employer: "Acme" })).toBe(false);
  });
  it("rejects values outside a week", () => {
    expect(patch.safeParse({ officeDays: 8 }).success).toBe(false);
    expect(patch.safeParse({ officeDays: -1 }).success).toBe(false);
    expect(patch.safeParse({ officeDays: 2.5 }).success).toBe(false);
  });
  it("says what null and 0 mean in the tool description", () => {
    const description = vacancyFields.officeDays.description ?? "";
    expect(description).toMatch(/null/i);
    expect(description).toMatch(/remote/i);
  });
});
