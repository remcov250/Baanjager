import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Cheap gate only: is there a session cookie at all? Whether it is *valid* is
// checked against the database in the (app) layout, which runs on Node.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/setup" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
