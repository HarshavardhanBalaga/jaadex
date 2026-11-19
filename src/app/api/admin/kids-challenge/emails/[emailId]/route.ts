import { isValidObjectId } from "mongoose";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail, ok } from "@/lib/admin/respond";
import { getKidsChallengeEmail } from "@/lib/kids-challenge/email-service";

export const dynamic = "force-dynamic";

/** Admin-only: one sent email with every parent's delivery status. */
export async function GET(_request: Request, context: { params: Promise<{ emailId: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { emailId } = await context.params;
  if (!isValidObjectId(emailId)) return fail("invalid_request", "Invalid email id.", 400);
  try {
    const email = await getKidsChallengeEmail(emailId);
    if (!email) return fail("not_found", "Email not found.", 404);
    return ok({ email });
  } catch (err) {
    console.error("[kids-challenge-email] detail unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
