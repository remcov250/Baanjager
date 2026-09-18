import { idFrom, json, readJson, requireApi } from "@/lib/api";
import { getVacancy, setCvLink } from "@/lib/vacancies";
import { cvLinkInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Record which CV in the CV builder belongs to this vacancy. Only the reference
// is stored — the CV itself stays where it was made. PUT is idempotent: the same
// resumeId twice is a no-op; resumeId null removes the link.
export async function PUT(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  if (!id || !getVacancy(id)) return json({ error: "not found" }, 404);
  const parsed = cvLinkInput.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  const vacancy = setCvLink(id, parsed.data)!;
  return json({ id: vacancy.id, resumeId: vacancy.cvResumeId, url: vacancy.cvUrl, linkedAt: vacancy.cvLinkedAt });
}
