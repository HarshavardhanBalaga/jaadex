import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { resendRegistrationConfirmation } from "@/lib/workshops/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only: resend a confirmation email that failed or was never sent. Session token + CSRF double-submit. */
export async function POST(request: Request, context: { params: Promise<{ id: string; registrationId: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-registration-resend:${clientIp(request)}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id, registrationId } = await context.params;
  if (!isValidObjectId(id) || !isValidObjectId(registrationId)) return fail("invalid_request", "Invalid id.", 400);
  try {
    const result = await resendRegistrationConfirmation(id, registrationId);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Registration not found.", 404);
      return fail("already_sent_or_in_progress", "This email was already sent or is being sent right now.", 409);
    }
    return NextResponse.json({ success: true, status: result.status }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-registration] resend unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
