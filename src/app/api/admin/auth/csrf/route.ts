import { NextResponse } from "next/server";
import { issueCsrfCookie } from "@/lib/admin/csrf";

export const dynamic = "force-dynamic";

/** Public CSRF issuance for double-submit flow. */
export async function GET() {
  try {
    const token = await issueCsrfCookie();
    return NextResponse.json({ success: true, csrfToken: token });
  } catch (err) {
    console.error("[admin-auth][csrf] unavailable:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: { code: "csrf_unavailable", message: "Try again shortly." } },
      { status: 503 },
    );
  }
}
