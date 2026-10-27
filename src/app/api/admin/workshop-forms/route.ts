import { NextResponse } from "next/server";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { createWorkshopFormSchema } from "@/lib/workshop-forms/validation";
import { createWorkshopForm, listWorkshopsWithFormStatus } from "@/lib/workshop-forms/service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: false, error: { code, message, ...extra } }, { status, headers: NO_STORE });
}

/** Admin-only: every workshop with its form status. */
export async function GET() {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  try {
    const workshops = await listWorkshopsWithFormStatus();
    return NextResponse.json({ success: true, workshops }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-forms] list unavailable:", err);
    return fail("unavailable", "Service temporarily unavailable.", 503);
  }
}

/** Admin-only create: one form per workshop. Session token + CSRF double-submit. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-form-create:${clientIp(request)}`, 30, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = createWorkshopFormSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);
  }
  try {
    const result = await createWorkshopForm({
      workshopId: parsed.data.workshopId,
      schema: parsed.data.schema,
      adminId: checked.ctx.admin._id,
    });
    if (!result.ok) {
      if (result.code === "form_exists") return fail(result.code, "This workshop already has a form. Open it to edit.", 409);
      return fail(result.code, "Workshop not found.", 404);
    }
    return NextResponse.json({ success: true, updatedAt: result.updatedAt }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-forms] create unavailable:", err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
