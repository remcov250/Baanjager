import { idFrom, json, requireApi } from "@/lib/api";
import { buildCvContext } from "@/lib/context";
import { getProfile } from "@/lib/profile";
import { getVacancy } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Everything a CV builder needs for this vacancy, read-only. Baanjager never
// pushes; the assistant reads this and does the work in the CV builder.
export async function GET(request: Request, { params }: Ctx) {
  const denied = requireApi(request);
  if (denied) return denied;
  const id = idFrom((await params).id);
  const vacancy = id ? getVacancy(id) : undefined;
  if (!vacancy) return json({ error: "not found" }, 404);
  return json(buildCvContext(vacancy, getProfile()));
}
