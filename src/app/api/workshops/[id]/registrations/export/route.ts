import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { buildRegistrationsCsv, registrationsCsvFilename } from "@/lib/workshops/registration-csv";
import { listRegistrations, workshopTitle } from "@/lib/workshops/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only CSV download of a workshop's registrations. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  try {
    const title = await workshopTitle(id);
    if (title === null) return fail("not_found", "Workshop not found.", 404);
    const csv = buildRegistrationsCsv(await listRegistrations(id));
    return new NextResponse(csv, {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${registrationsCsvFilename(title)}"`,
      },
    });
  } catch (err) {
    console.error("[workshop-registration] export unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
