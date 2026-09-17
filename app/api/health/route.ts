// Unauthenticated liveness check for Docker and reverse proxies. Says nothing
// about the data, only that the process answers.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
