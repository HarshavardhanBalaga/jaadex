import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy (edge). UX redirect ONLY — never a security boundary.
 * Every /api/admin/* route and the dashboard page re-verify the session
 * server-side via requireAdminFromToken(); /contact and /api/contact
 * re-verify the website-user session via getCurrentUser().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/contact")) {
    // Website-user gate: every "Book a demo" / enquiry action lands here.
    if (request.cookies.get("__Host-jaadex_user")?.value) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/register")) {
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
  matcher: ["/admin/:path*", "/contact"],
};
