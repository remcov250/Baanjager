"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { setProfileSection, setSetting } from "@/lib/profile";
import { PROFILE_KEYS, profileInput } from "@/lib/validation";

export async function saveProfileAction(formData: FormData) {
  await requireSession();
  for (const key of PROFILE_KEYS) {
    const parsed = profileInput.safeParse({ key, content: formData.get(key) ?? "" });
    if (parsed.success) setProfileSection(key, parsed.data.content);
  }
  const homeBase = String(formData.get("home_base") ?? "").trim().slice(0, 200);
  setSetting("home_base", homeBase);
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
