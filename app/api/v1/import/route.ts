import { json, requireApi } from "@/lib/api";
import { importRows, parseCsv } from "@/lib/import";
import { createVacancy, vacancyExists } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  const text = await request.text();
  if (!text.trim()) return json({ error: "empty body; send CSV as text/csv" }, 400);
  if (text.length > MAX_BYTES) return json({ error: "too large" }, 413);
  const result = importRows(parseCsv(text), vacancyExists, (v) => {
    createVacancy(v);
  });
  return json(result);
}
