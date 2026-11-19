import { isValidObjectId } from "mongoose";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail, ok } from "@/lib/admin/respond";
import { getAdminRegistrationDetail } from "@/lib/kids-challenge/admin-service";

export const dynamic = "force-dynamic";

/** Admin-only: one registration with its full payment history. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid registration id.", 400);
  try {
    const registration = await getAdminRegistrationDetail(id);
    if (!registration) return fail("not_found", "Registration not found.", 404);
    return ok({ registration });
  } catch (err) {
    console.error("[kids-challenge-admin] detail unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
