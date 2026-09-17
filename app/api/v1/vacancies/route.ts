import { json, readJson, requireApi } from "@/lib/api";
import { createVacancy, listVacancySummaries } from "@/lib/vacancies";
import { vacancyInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const p = url.searchParams;
  return json(
    listVacancySummaries({
      q: p.get("q") ?? undefined,
      layer: p.get("layer") ?? undefined,
      verdict: p.get("verdict") ?? undefined,
      status: p.get("status") ?? undefined,
      closed: p.get("closed") === "1" || p.get("closed") === "true",
    }),
  );
}

export async function POST(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const body = await readJson(request);
  const parsed = vacancyInput.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  return json(createVacancy(parsed.data), 201);
}
