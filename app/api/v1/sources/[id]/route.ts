import { idFrom, json, readJson, requireApi } from "@/lib/api";
import { deleteSource, updateSource } from "@/lib/sources";
import { sourcePatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  if (!id) return json({ error: "not found" }, 404);
  const body = await readJson(request);
  const parsed = sourcePatch.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  const updated = updateSource(id, parsed.data);
  return updated ? json(updated) : json({ error: "not found" }, 404);
}

// Sources are a scan plan, not training data, so unlike vacancies they can go.
export async function DELETE(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  if (!id) return json({ error: "not found" }, 404);
  deleteSource(id);
  return json({ ok: true });
}
