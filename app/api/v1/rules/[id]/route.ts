import { idFrom, json, readJson, requireApi } from "@/lib/api";
import { setRuleRetired } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  if (!id) return json({ error: "not found" }, 404);
  const body = await readJson(request);
  if (typeof body?.retired !== "boolean") return json({ error: "expected { retired: boolean }" }, 400);
  if (!setRuleRetired(id, body.retired)) return json({ error: "not found" }, 404);
  return json({ ok: true });
}
