import { NextResponse, after } from "next/server";
import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { deliverWorkshopEmail, requeueFailedRecipients } from "@/lib/workshops/workshop-email-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only: resend to the recipients of this email that failed. Session token + CSRF double-submit. */
export async function POST(request: Request, context: { params: Promise<{ id: string; emailId: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-email-retry:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id, emailId } = await context.params;
  if (!isValidObjectId(id) || !isValidObjectId(emailId)) return fail("invalid_request", "Invalid id.", 400);
  try {
    const result = await requeueFailedRecipients(id, emailId);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Email not found.", 404);
      return fail("nothing_to_retry", "There are no failed recipients to retry.", 409);
    }
    after(() =>
      deliverWorkshopEmail(emailId).catch((err) =>
        console.error("[workshop-email] retry delivery error:", err instanceof Error ? err.message : err),
      ),
    );
    return NextResponse.json({ success: true, queued: result.queued }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-email] retry unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
