import { after } from "next/server";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fail, ok, readJson } from "@/lib/admin/respond";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { KIDS_EMAIL_PAGE_LIMIT, kidsChallengeEmailSchema, kidsEmailListQuerySchema } from "@/lib/kids-challenge/email-validation";
import { createKidsChallengeEmail, deliverKidsChallengeEmail, kidsEmailAudienceCounts, listKidsChallengeEmails } from "@/lib/kids-challenge/email-service";

export const dynamic = "force-dynamic";

/** Admin-only: email paid, pending, all or selected Kids Challenge parents. Session token + CSRF double-submit. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`kids-challenge-email:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const body = await readJson(request);
  if (body.error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = kidsChallengeEmailSchema.safeParse(body.data);
  if (!parsed.success) return fail("validation_error", "Check the highlighted fields.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    const result = await createKidsChallengeEmail(parsed.data, checked.ctx.admin.email);
    if (!result.ok) {
      if (result.reason === "attachments_invalid") return fail("attachments_invalid", result.message, 400, { fields: { attachmentIds: [result.message] } });
      return fail("no_recipients", "No parents match this audience.", 409);
    }
    // Deliver after responding: a large send never blocks the admin. Each outcome is stored per recipient.
    const emailId = result.id;
    after(() =>
      deliverKidsChallengeEmail(emailId).catch((err) => console.error("[kids-challenge-email] delivery error:", err instanceof Error ? err.message : err)),
    );
    return ok({ id: emailId, recipientCount: result.recipientCount }, 201);
  } catch (err) {
    console.error("[kids-challenge-email] create unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}

/** Admin-only: sent emails, newest first, with delivery totals and the current audience sizes. Query: page. */
export async function GET(request: Request) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const parsed = kidsEmailListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail("validation_error", "Invalid list parameters.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    const [list, audienceCounts] = await Promise.all([listKidsChallengeEmails(parsed.data.page, KIDS_EMAIL_PAGE_LIMIT), kidsEmailAudienceCounts()]);
    return ok({ ...list, audienceCounts });
  } catch (err) {
    console.error("[kids-challenge-email] list unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
