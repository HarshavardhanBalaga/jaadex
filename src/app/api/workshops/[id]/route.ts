import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkshopModel } from "@/models/Workshop";
import { DUPLICATE_TITLE_MESSAGE, isDuplicateKeyError, isWorkshopTitleTaken } from "@/lib/workshops/queries";
import { workshopUpdateSchema } from "@/lib/workshops/validation";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only edit: session token + CSRF double-submit. Keeps the stored image unless a new one is sent. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const limited = await checkRateLimit(`workshop-update:${clientIp(request)}`, 10, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = workshopUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "validation_error", message: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    if (await isWorkshopTitleTaken(parsed.data.title, id)) return fail("duplicate_title", DUPLICATE_TITLE_MESSAGE, 409);
    await connectToDatabase();
    const updated = await WorkshopModel.findByIdAndUpdate(
      id,
      {
        title: parsed.data.title,
        description: parsed.data.description,
        date: parsed.data.date,
        location: parsed.data.location,
        ...(parsed.data.image ? { image: parsed.data.image } : {}),
      },
      { runValidators: true },
    )
      .select({ _id: 1 })
      .lean();
    if (!updated) return fail("not_found", "Workshop not found.", 404);
    return NextResponse.json({ success: true, message: "Workshop updated." }, { headers: NO_STORE });
  } catch (err) {
    if (isDuplicateKeyError(err)) return fail("duplicate_title", DUPLICATE_TITLE_MESSAGE, 409);
    console.error("[workshops] update unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}

/** Admin-only delete: session token + CSRF double-submit. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = await validateCsrf(_request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  try {
    await connectToDatabase();
    const deleted = await WorkshopModel.findByIdAndDelete(id).lean();
    if (!deleted) return fail("not_found", "Workshop not found.", 404);
    return NextResponse.json({ success: true, message: "Workshop removed." }, { headers: NO_STORE });
  } catch (err) {
    console.error("[workshops] delete unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}