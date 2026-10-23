import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkshopModel } from "@/models/Workshop";
import { validateCsrf } from "@/lib/admin/csrf";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
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