/**
 * Redirect helpers shared by the website-user Google OAuth routes (SERVER-ONLY).
 * Admins sign in with email + password only; there is no admin Google flow.
 * Redirects are absolute (APP_URL) and never carry tokens or provider error details.
 */
import "server-only";
import { NextResponse } from "next/server";
import { getAdminAuthConfig } from "./auth-config";

export function adminAppUrl(request: Request): string {
  try {
    return getAdminAuthConfig().appUrl;
  } catch {
    return new URL(request.url).origin;
  }
}

export function noStoreRedirect(url: string | URL): NextResponse {
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
