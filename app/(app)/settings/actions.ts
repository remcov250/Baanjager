"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { importVacanciesCsv } from "@/lib/vacancies";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_REASONS = 5;

export async function importCsvAction(formData: FormData) {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect("/settings?import=empty");
  if (file.size > MAX_UPLOAD_BYTES) redirect("/settings?import=toolarge");

  const result = importVacanciesCsv(await file.text());
  revalidatePath("/"); revalidatePath("/vacancies");
  // The first few reasons travel along in the URL, so the page can say which
  // rows didn't come in and why; the rest is a count.
  const reasons = new URLSearchParams();
  for (const error of result.errors.slice(0, MAX_REASONS)) reasons.append("why", error.slice(0, 160));
  const status = result.rejected ? "invalid" : "done";
  redirect(`/settings?import=${status}&added=${result.added}&skipped=${result.skipped}&${reasons}`);
}
