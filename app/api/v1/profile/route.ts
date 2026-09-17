import { json, readJson, requireApi } from "@/lib/api";
import { getProfile, getSetting, setProfileSection } from "@/lib/profile";
import { profileInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  return json({ homeBase: getSetting("home_base"), sections: getProfile() });
}

export async function PUT(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const body = await readJson(request);
  const parsed = profileInput.safeParse(body ?? {});
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues }, 400);
  setProfileSection(parsed.data.key, parsed.data.content);
  return json({ ok: true });
}
