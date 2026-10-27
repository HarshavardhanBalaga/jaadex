import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { updateWorkshopFormSchema } from "@/lib/workshop-forms/validation";
import { getWorkshopWithForm, updateWorkshopForm } from "@/lib/workshop-forms/service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only: the workshop and its form schema (form is null until one is created). */
export async function GET(_request: Request, context: { params: Promise<{ workshopId: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { workshopId } = await context.params;
  if (!isValidObjectId(workshopId)) return fail("invalid_request", "Invalid workshop id.", 400);
  try {
    const data = await getWorkshopWithForm(workshopId);
    if (!data) return fail("not_found", "Workshop not found.", 404);
    return NextResponse.json({ success: true, ...data }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-forms] read unavailable:", err);
    return fail("unavailable", "Service temporarily unavailable.", 503);
  }
}

/** Admin-only update of an existing form. Never creates one (use POST on the collection). */
export async function PUT(request: Request, context: { params: Promise<{ workshopId: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { workshopId } = await context.params;
  if (!isValidObjectId(workshopId)) return fail("invalid_request", "Invalid workshop id.", 400);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = updateWorkshopFormSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);
  }
  try {
    const result = await updateWorkshopForm({
      workshopId,
      schema: parsed.data.schema,
      adminId: checked.ctx.admin._id,
    });
    if (!result.ok) return fail(result.code, "This workshop has no form yet. Create it first.", 404);
    return NextResponse.json({ success: true, updatedAt: result.updatedAt }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-forms] update unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
