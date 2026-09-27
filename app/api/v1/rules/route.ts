import { json, readJson, requireApi } from "@/lib/api";
import { createRule, listRules } from "@/lib/rules";
import { getVacancy } from "@/lib/vacancies";
import { ruleInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const retired = new URL(request.url).searchParams.get("retired") === "1";
  return json(listRules(retired));
}

export async function POST(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const body = await readJson(request);
  const parsed = ruleInput.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  if (parsed.data.sourceVacancyId && !getVacancy(parsed.data.sourceVacancyId)) {
    return json({ error: "invalid", issues: [{ path: ["sourceVacancyId"], message: "no vacancy with this id" }] }, 400);
  }
  return json(createRule(parsed.data), 201);
}
