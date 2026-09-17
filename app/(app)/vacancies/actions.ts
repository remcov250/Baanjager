"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createRule } from "@/lib/rules";
import { createVacancy, getVacancy, updateVacancy } from "@/lib/vacancies";
import { VACANCY_FIELDS, formToObject, ruleInput, vacancyInput } from "@/lib/validation";

function parseForm(formData: FormData) {
  const raw = formToObject(formData, VACANCY_FIELDS);
  // An unchecked checkbox is simply absent from the form; make that explicit so
  // an edit can turn it off again.
  raw.sourceVerified = formData.get("sourceVerified") === "on";
  return vacancyInput.safeParse(raw);
}

export async function createVacancyAction(formData: FormData) {
  await requireSession();
  const parsed = parseForm(formData);
  if (!parsed.success) redirect("/vacancies/new?error=validation");
  const vacancy = createVacancy(parsed.data);
  revalidatePath("/"); revalidatePath("/vacancies");
  redirect(`/vacancies/${vacancy.id}?saved=1`);
}

export async function updateVacancyAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || !getVacancy(id)) redirect("/");
  const parsed = parseForm(formData);
  if (!parsed.success) redirect(`/vacancies/${id}?error=validation`);
  updateVacancy(id, parsed.data);
  revalidatePath("/"); revalidatePath("/vacancies");
  revalidatePath(`/vacancies/${id}`);
  redirect(`/vacancies/${id}?saved=1`);
}

export async function createRuleFromVacancyAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("vacancyId"));
  if (!Number.isInteger(id) || !getVacancy(id)) redirect("/");
  const parsed = ruleInput.safeParse({
    kind: formData.get("kind"),
    text: formData.get("text"),
    rationale: formData.get("rationale"),
    sourceVacancyId: id,
  });
  if (!parsed.success) redirect(`/vacancies/${id}?error=rule`);
  createRule(parsed.data);
  revalidatePath("/criteria");
  revalidatePath(`/vacancies/${id}`);
  redirect(`/vacancies/${id}?rule=1`);
}
