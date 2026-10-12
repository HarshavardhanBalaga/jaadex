/**
 * CSRF helpers (SERVER-ONLY). Double-submit cookie + header + Origin check.
 * Applies to ALL cookie POSTs including unauthenticated login/register
 * (prevents login-CSRF). Safe GETs are exempt.
 */
import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminAuthConfig } from "./auth-config";
import { CSRF_COOKIE_NAME } from "./cookies";

export function newCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function originAllowed(request: Request, appUrl: string, clientUrl: string): boolean {
  const allowed = new Set(
    [appUrl, clientUrl].map((u) => u.replace(/\/+$/, "").toLowerCase()),
  );
  const origin = request.headers.get("origin")?.trim().toLowerCase();
  if (origin) return allowed.has(origin.replace(/\/+$/, ""));
  const referer = request.headers.get("referer")?.trim().toLowerCase();
  if (referer) {
    try {
      const u = new URL(referer);
      return [...allowed].some((a) => {
        try {
          const au = new URL(a);
          return au.origin.toLowerCase() === u.origin.toLowerCase();
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }
  return false;
}

/** Returns null when valid, otherwise a machine code for 403. */
export async function validateCsrf(request: Request): Promise<string | null> {
  let c;
  try {
    c = getAdminAuthConfig();
  } catch {
    return "auth_unavailable";
  }
  const header = request.headers.get("x-csrf-token")?.trim() ?? "";
  const store = await cookies();
  const cookie = store.get(CSRF_COOKIE_NAME)?.value ?? "";
  if (!header || !cookie) return "csrf_missing";
  if (!safeEqual(header, cookie)) return "csrf_invalid";
  if (!originAllowed(request, c.appUrl, c.clientUrl)) return "csrf_origin";
  return null;
}

export async function issueCsrfCookie(): Promise<string> {
  const c = getAdminAuthConfig();
  const token = newCsrfToken();
  const store = await cookies();
  store.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: c.useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  return token;
}
