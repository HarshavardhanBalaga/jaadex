import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fail, ok } from "@/lib/admin/respond";
import { syncRegistrationPayments } from "@/lib/kids-challenge/admin-service";

export const dynamic = "force-dynamic";

/** Admin-only: re-check a registration's orders with Razorpay and apply what Razorpay reports. Session + CSRF double-submit. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`kids-challenge-sync:${clientIp(request)}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid registration id.", 400);
  try {
    const result = await syncRegistrationPayments(id);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Registration not found.", 404);
      if (result.reason === "not_configured") return fail("payments_unavailable", "Razorpay keys are not configured on the server.", 503);
      return fail("no_orders", "This parent never opened the payment window, so there is nothing to check with Razorpay.", 409);
    }
    return ok({ sync: result });
  } catch (err) {
    console.error("[kids-challenge-admin] sync failed:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Couldn't reach Razorpay. Try again in a moment.", 503);
  }
}
