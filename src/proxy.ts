import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie presence). Real authorization happens in the
// Data Access Layer (src/server/auth.ts) on every page, action and route handler.
const SESSION_COOKIE = "fin_session";
const PUBLIC_PATHS = ["/login", "/cadastro"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
