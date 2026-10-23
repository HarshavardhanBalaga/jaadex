import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Admin pages that must stay reachable without a session. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/register", "/admin/forgot-password"];

/**
 * Next.js 16 proxy (edge). UX redirect ONLY — never a security boundary.
 * Every /api/admin/* route and the dashboard page re-verify the session
 * server-side via requireAdminFromToken().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  const hasAccess = Boolean(request.cookies.get("__Host-jaadex_at")?.value);
  if (!hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
