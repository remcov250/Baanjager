import { json, requireApi } from "@/lib/api";
import { importVacanciesCsv } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  // Refuse on the declared size before reading anything, and cap what is read
  // when no size was declared, so a large body is never buffered whole.
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BYTES) return json({ error: "too large" }, 413);
  const text = await readCapped(request, MAX_BYTES);
  if (text === null) return json({ error: "too large" }, 413);
  if (!text.trim()) return json({ error: "empty body; send CSV as text/csv" }, 400);
  const result = importVacanciesCsv(text);
  return json(result, result.rejected ? 400 : 200);
}

async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
