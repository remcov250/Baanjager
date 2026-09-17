import { idFrom, json, readJson, requireApi } from "@/lib/api";
import { rulesForVacancy } from "@/lib/rules";
import { getVacancy, updateVacancy } from "@/lib/vacancies";
import { vacancyPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  const vacancy = id ? getVacancy(id) : undefined;
  if (!vacancy) return json({ error: "not found" }, 404);
  return json({ ...vacancy, rules: rulesForVacancy(vacancy.id) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  if (!id || !getVacancy(id)) return json({ error: "not found" }, 404);
  const body = await readJson(request);
  const parsed = vacancyPatch.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  return json(updateVacancy(id, parsed.data));
}

// Deliberately no DELETE. Set status to "dropped" instead; the reason stays.
