/**
 * Shared bits for the admin Google OAuth routes (SERVER-ONLY).
 * Redirects are absolute (APP_URL) and never carry tokens or provider
 * error details — failures land on one generic login error.
 */
import "server-only";
import { NextResponse } from "next/server";
import { getAdminAuthConfig } from "./auth-config";

export const ADMIN_GOOGLE_TXN_COOKIE = "__Host-jaadex_admin_oauth";
export const ADMIN_GOOGLE_CALLBACK_PATH = "/api/admin/auth/google/callback";

export function adminAppUrl(request: Request): string {
  try {
    return getAdminAuthConfig().appUrl;
  } catch {
    return new URL(request.url).origin;
  }
}

export function adminGoogleRedirectUri(): string {
  return `${getAdminAuthConfig().appUrl}${ADMIN_GOOGLE_CALLBACK_PATH}`;
}

export function noStoreRedirect(url: string | URL): NextResponse {
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export function googleLoginFailed(request: Request): NextResponse {
  return noStoreRedirect(new URL("/admin/login?error=google", adminAppUrl(request)));
}
