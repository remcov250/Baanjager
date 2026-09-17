import { getSession } from "@/lib/auth";
import { vacanciesToCsv } from "@/lib/export";
import { listVacancies } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSession())) {
    return new Response("unauthorized", { status: 401 });
  }
  const csv = vacanciesToCsv(listVacancies({ closed: true }));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="baanjager-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
