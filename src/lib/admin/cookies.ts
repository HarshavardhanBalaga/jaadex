/**
 * Cookie helpers (SERVER-ONLY).
 * Corrected: __Host- requires Path=/ and NO Domain on every cookie.
 * Path scoping is NOT a security boundary; refresh isolation is enforced
 * server-side via familyId + refresh-hash lookup.
 */
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthConfig } from "./auth-config";

/**
 * Cookie names are protocol constants, intentionally NOT read from env.
 * __Host- requires Path=/ and no Domain; that contract never varies.
 */
export const ACCESS_COOKIE_NAME = "__Host-jaadex_at";
export const REFRESH_COOKIE_NAME = "__Host-jaadex_rt";
export const CSRF_COOKIE_NAME = "__Host-jaadex_csrf";

export interface CookieSpec {
  name: string;
  value: string;
  maxAge: number;
}

export function accessCookieSpec(token: string): CookieSpec {
  const c = getAdminAuthConfig();
  return { name: ACCESS_COOKIE_NAME, value: token, maxAge: c.accessExpiresSeconds };
}

export function refreshCookieSpec(token: string): CookieSpec {
  const c = getAdminAuthConfig();
  return { name: REFRESH_COOKIE_NAME, value: token, maxAge: c.refreshExpiresSeconds };
}

export async function setAuthCookies(specs: CookieSpec[]): Promise<void> {
  const c = getAdminAuthConfig();
  const store = await cookies();
  for (const s of specs) {
    store.set(s.name, s.value, {
      httpOnly: true,
      secure: c.useSecureCookies,
      sameSite: "lax",
      path: "/",
      maxAge: s.maxAge,
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const c = getAdminAuthConfig();
  const store = await cookies();
  for (const name of [ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME]) {
    store.set(name, "", { httpOnly: true, secure: c.useSecureCookies, sameSite: "lax", path: "/", maxAge: 0 });
  }
  // Rotate CSRF on logout to prevent fixation.
  const { newCsrfToken } = await import("./csrf");
  const rotated = newCsrfToken();
  store.set(CSRF_COOKIE_NAME, rotated, {
    httpOnly: false,
    secure: c.useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
}

export async function readAuthCookies(): Promise<{ access: string | null; refresh: string | null }> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE_NAME)?.value ?? null,
    refresh: store.get(REFRESH_COOKIE_NAME)?.value ?? null,
  };
}
