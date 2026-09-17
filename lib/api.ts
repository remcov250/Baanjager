import { apiTokenMatches } from "@/lib/auth";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Returns a Response when the request must be rejected, otherwise null.
export function requireApi(request: Request): Response | null {
  if (!process.env.API_TOKEN) {
    return json({ error: "API is disabled; set API_TOKEN to enable it" }, 503);
  }
  if (!apiTokenMatches(request.headers.get("authorization"))) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export function idFrom(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
