import { requireApi } from "@/lib/api";
import { vacanciesToCsv } from "@/lib/export";
import { listVacancies } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireApi(request);
  if (denied) return denied;
  return new Response(vacanciesToCsv(listVacancies({ closed: true })), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
}
