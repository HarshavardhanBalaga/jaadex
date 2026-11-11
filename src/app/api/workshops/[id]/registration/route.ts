import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { fieldErrorsOf, registrationSettingsSchema } from "@/lib/workshops/registration-validation";
import { updateRegistrationSettings } from "@/lib/workshops/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only: open/close registration and set the seat limit. Session token + CSRF double-submit. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-registration-settings:${clientIp(request)}`, 20, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = registrationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "validation_error", message: "Check the highlighted fields.", fields: fieldErrorsOf(parsed.error) } },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const result = await updateRegistrationSettings(id, parsed.data);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Workshop not found.", 404);
      if (result.reason === "completed") return fail("workshop_completed", "This workshop has already taken place, so registration can't be opened.", 409);
      return fail(
        "capacity_below_count",
        `${result.count} people have already registered. Set the seat limit to at least ${result.count}.`,
        409,
      );
    }
    return NextResponse.json({ success: true, registration: result.registration }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-registration] settings unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
