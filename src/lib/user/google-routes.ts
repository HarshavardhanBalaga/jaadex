/**
 * Shared bits for the website-user Google OAuth routes (SERVER-ONLY). Its own
 * transaction cookie and callback path keep it separate from admin sign-in.
 * Failures land on one generic login error; no provider details are exposed.
 */
import "server-only";
import type { NextResponse } from "next/server";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { adminAppUrl, noStoreRedirect } from "@/lib/admin/google-routes";
import { safeNext } from "./safe-next";

export const USER_GOOGLE_TXN_COOKIE = "__Host-jaadex_user_oauth";
export const USER_GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function userGoogleRedirectUri(): string {
  return `${getAdminAuthConfig().appUrl}${USER_GOOGLE_CALLBACK_PATH}`;
}

/** Generic failure: back to login with the error flag, keeping a safe `next` so the user can retry. */
export function userGoogleLoginFailed(request: Request, next?: string): NextResponse {
  const url = new URL("/login", adminAppUrl(request));
  url.searchParams.set("error", "google");
  const safe = safeNext(next ?? null);
  if (safe !== "/") url.searchParams.set("next", safe);
  return noStoreRedirect(url);
}
