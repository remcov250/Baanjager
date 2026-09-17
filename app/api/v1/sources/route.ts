import { json, readJson, requireApi } from "@/lib/api";
import { createSource, listSources } from "@/lib/sources";
import { sourceInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const activeOnly = new URL(request.url).searchParams.get("active") === "1";
  const rows = listSources();
  return json(activeOnly ? rows.filter((s) => s.active) : rows);
}

export async function POST(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const body = await readJson(request);
  const parsed = sourceInput.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  return json(createSource(parsed.data), 201);
}
