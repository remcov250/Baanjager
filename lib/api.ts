import { apiAccess } from "@/lib/auth";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const READ_METHODS = new Set(["GET", "HEAD"]);

// Returns a Response when the request must be rejected, otherwise null. The
// read-only token passes for GET and HEAD and nothing else, whatever the route.
export function requireApi(request: Request): Response | null {
  if (!process.env.API_TOKEN) {
    return json({ error: "API is disabled; set API_TOKEN to enable it" }, 503);
  }
  const access = apiAccess(request.headers.get("authorization"));
  if (!access) return json({ error: "unauthorized" }, 401);
  if (access === "readonly" && !READ_METHODS.has(request.method.toUpperCase())) {
    return json({ error: "read-only token" }, 403);
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
