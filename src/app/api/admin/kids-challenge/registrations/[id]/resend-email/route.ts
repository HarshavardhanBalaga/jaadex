import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fail, ok } from "@/lib/admin/respond";
import { resendKidsConfirmation } from "@/lib/kids-challenge/confirmation-service";

export const dynamic = "force-dynamic";

/** Admin-only: resend the payment confirmation email to the parent's registered address. Session + CSRF double-submit. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`kids-challenge-resend:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid registration id.", 400);
  try {
    const result = await resendKidsConfirmation(id);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Registration not found.", 404);
      if (result.reason === "not_paid") return fail("not_paid", "The confirmation email is sent after payment. This registration isn't paid yet.", 409);
      return fail("in_progress", "This email is already being sent. Wait a moment and refresh.", 409);
    }
    return ok({ status: result.status });
  } catch (err) {
    console.error("[kids-challenge-email] resend failed:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
