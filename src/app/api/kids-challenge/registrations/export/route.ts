import { NextResponse } from "next/server";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { buildKidsChallengeCsv, KIDS_CHALLENGE_CSV_FILENAME } from "@/lib/kids-challenge/registration-csv";
import { listKidsChallengeRegistrations } from "@/lib/kids-challenge/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/** Admin-only CSV download of all Kids Creative Challenge registrations. */
export async function GET() {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  try {
    const csv = buildKidsChallengeCsv(await listKidsChallengeRegistrations());
    return new NextResponse(csv, {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${KIDS_CHALLENGE_CSV_FILENAME}"`,
      },
    });
  } catch (err) {
    console.error("[kids-challenge-registration] export unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
