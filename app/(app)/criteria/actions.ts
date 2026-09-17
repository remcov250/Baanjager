"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createRule, setRuleRetired } from "@/lib/rules";
import { ruleInput } from "@/lib/validation";

export async function createRuleAction(formData: FormData) {
  await requireSession();
  const parsed = ruleInput.safeParse({
    kind: formData.get("kind"),
    text: formData.get("text"),
    rationale: formData.get("rationale"),
    sourceVacancyId: formData.get("sourceVacancyId"),
  });
  if (!parsed.success) redirect("/criteria?error=validation");
  createRule(parsed.data);
  revalidatePath("/criteria");
  redirect("/criteria?saved=1");
}

export async function setRuleRetiredAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const retired = formData.get("retired") === "1";
  if (Number.isInteger(id)) setRuleRetired(id, retired);
  revalidatePath("/criteria");
  redirect(retired ? "/criteria" : "/criteria?retired=1");
}
