/** Consistent JSON envelope. Never includes tokens, OTPs, hashes or stack traces. */
import { NextResponse } from "next/server";

/**
 * Authentication + sensitive admin responses must never be cached:
 * prevents credential/session data resting in browser or proxy caches.
 * Helpers here are used only by admin auth API routes.
 */
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

export function ok<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status, headers: NO_STORE_HEADERS });
}

export function fail(code: string, message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, ...extra } },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function readJson(request: Request): Promise<{ data: unknown; error: boolean }> {
  try {
    return { data: await request.json(), error: false };
  } catch {
    return { data: null, error: true };
  }
}
