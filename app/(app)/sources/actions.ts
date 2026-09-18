"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createSource, deleteSource, setSourceActive, updateSource } from "@/lib/sources";
import { sourceInput } from "@/lib/validation";

export async function createSourceAction(formData: FormData) {
  await requireSession();
  const parsed = sourceInput.safeParse({
    layer: formData.get("layer"),
    label: formData.get("label"),
    url: formData.get("url"),
    note: formData.get("note"),
    cadence: formData.get("cadence"),
    active: true,
  });
  if (!parsed.success) redirect("/sources?error=validation");
  createSource(parsed.data);
  revalidatePath("/sources");
  redirect("/sources?saved=1");
}

export async function toggleSourceAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) setSourceActive(id, formData.get("active") === "1");
  revalidatePath("/sources");
  redirect("/sources");
}

export async function deleteSourceAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) deleteSource(id);
  revalidatePath("/sources");
  redirect("/sources");
}

export async function updateSourceAction(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/sources");
  const parsed = sourceInput.safeParse({
    layer: formData.get("layer"),
    label: formData.get("label"),
    url: formData.get("url"),
    note: formData.get("note"),
    cadence: formData.get("cadence"),
  });
  if (!parsed.success) redirect("/sources?error=validation");
  updateSource(id, parsed.data);
  revalidatePath("/sources");
  redirect(`/sources?saved=1&open=${id}`);
}
