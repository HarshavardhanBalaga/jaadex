import { NextResponse, after } from "next/server";
import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { workshopEmailSchema } from "@/lib/workshops/workshop-email-validation";
import { createWorkshopEmail, deliverWorkshopEmail, listWorkshopEmails } from "@/lib/workshops/workshop-email-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only: email all or selected registrants of this workshop. Session token + CSRF double-submit. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-email:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = workshopEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "validation_error", message: "Check the highlighted fields.", fields: fieldErrorsOf(parsed.error) } },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const result = await createWorkshopEmail(id, parsed.data, checked.ctx.admin.email);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Workshop not found.", 404);
      if (result.reason === "attachments_invalid") {
        return NextResponse.json(
          { success: false, error: { code: "attachments_invalid", message: result.message, fields: { attachmentIds: [result.message] } } },
          { status: 400, headers: NO_STORE },
        );
      }
      return fail("no_recipients", "No registrants to email for this workshop.", 409);
    }
    // Deliver after responding: a large send never blocks the admin. Each outcome is stored per recipient.
    const emailId = result.id;
    after(() =>
      deliverWorkshopEmail(emailId).catch((err) =>
        console.error("[workshop-email] delivery error:", err instanceof Error ? err.message : err),
      ),
    );
    return NextResponse.json({ success: true, id: emailId, recipientCount: result.recipientCount }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-email] create unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}

/** Admin-only: emails sent for this workshop, newest first, with per-recipient delivery status. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  try {
    return NextResponse.json({ success: true, emails: await listWorkshopEmails(id) }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-email] list unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
