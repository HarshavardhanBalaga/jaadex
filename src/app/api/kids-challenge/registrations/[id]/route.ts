import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user/session";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { fieldErrorsOf, kidsChallengeRegistrationSchema } from "@/lib/kids-challenge/registration-validation";
import { updatePendingKidsChallengeRegistration } from "@/lib/kids-challenge/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * Update the saved details of an unpaid registration of the signed-in user (same checks as POST).
 * Paid registrations cannot be changed here.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in to edit this registration.", 401);
  const limited = await checkRateLimit(`kids-challenge-register:${user.id}`, 5, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) return fail("not_found", "Registration not found.", 404);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = kidsChallengeRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "validation_error", message: "Check the highlighted fields.", fields: fieldErrorsOf(parsed.error) } },
      { status: 400, headers: NO_STORE },
    );
  }
  if (parsed.data.website) return NextResponse.json({ success: true, message: "Registration updated." }, { status: 200, headers: NO_STORE });
  try {
    const result = await updatePendingKidsChallengeRegistration(user, id, parsed.data);
    if (!result.ok) {
      if (result.reason === "not_found") return fail("not_found", "Registration not found.", 404);
      if (result.reason === "already_paid") return fail("already_paid", "This registration is already paid and can't be changed.", 409);
      const message = "You have already registered this student.";
      return NextResponse.json(
        { success: false, error: { code: "already_registered", message, fields: { studentName: [message] } } },
        { status: 409, headers: NO_STORE },
      );
    }
    return NextResponse.json({ success: true, registrationId: id, message: "Registration updated." }, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.error("[kids-challenge-registration] update unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
