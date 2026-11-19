import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail, ok } from "@/lib/admin/respond";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { adminPaymentsQuerySchema } from "@/lib/kids-challenge/admin-validation";
import { paymentMethods, queryAdminPayments } from "@/lib/kids-challenge/admin-service";

export const dynamic = "force-dynamic";

/**
 * Admin-only: payment history (one row per Razorpay order).
 * Query: page, limit, q, status (all|paid|failed|created), method, from, to (YYYY-MM-DD, India time), order.
 */
export async function GET(request: Request) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const parsed = adminPaymentsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail("validation_error", "Invalid list parameters.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    const [result, methods] = await Promise.all([queryAdminPayments(parsed.data), paymentMethods()]);
    return ok({ ...result, methods });
  } catch (err) {
    console.error("[kids-challenge-admin] payments unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
