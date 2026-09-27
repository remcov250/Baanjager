import { json, readJson, requireApi } from "@/lib/api";
import { createVacancy, findVacancyByPosting, listVacancySummaries } from "@/lib/vacancies";
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
  // The same posting twice splits its history over two rows. Refuse it and say
  // which row already has it; ?allowDuplicate=1 is for the rare page that
  // really lists two roles.
  const url = new URL(request.url);
  const allowDuplicate = ["1", "true"].includes(url.searchParams.get("allowDuplicate") ?? "");
  if (!allowDuplicate) {
    const existing = findVacancyByPosting(parsed.data.url);
    if (existing) return json({ error: "duplicate", existing }, 409);
  }
  return json(createVacancy(parsed.data), 201);
}
