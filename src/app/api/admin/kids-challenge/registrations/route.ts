import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail, ok } from "@/lib/admin/respond";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { adminRegistrationsQuerySchema } from "@/lib/kids-challenge/admin-validation";
import { queryAdminRegistrations } from "@/lib/kids-challenge/admin-service";

export const dynamic = "force-dynamic";

/**
 * Admin-only: one page of Kids Challenge registrations.
 * Query: page, limit, q, payment (all|paid|pending), studentClass, state, sort (createdAt|studentName|paidAt), order.
 */
export async function GET(request: Request) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const parsed = adminRegistrationsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail("validation_error", "Invalid list parameters.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    return ok(await queryAdminRegistrations(parsed.data));
  } catch (err) {
    console.error("[kids-challenge-admin] registrations unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
