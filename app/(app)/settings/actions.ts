"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { importRows, parseCsv } from "@/lib/import";
import { createVacancy, vacancyExists } from "@/lib/vacancies";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function importCsvAction(formData: FormData) {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/settings?import=empty");
  if (file.size > MAX_UPLOAD_BYTES) redirect("/settings?import=toolarge");

  const rows = parseCsv(await file.text());
  const result = importRows(rows, vacancyExists, (v) => {
    createVacancy(v);
  });
  revalidatePath("/"); revalidatePath("/vacancies");
  redirect(`/settings?import=done&added=${result.added}&skipped=${result.skipped}`);
}
