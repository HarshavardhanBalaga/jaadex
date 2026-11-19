import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user/session";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { fieldErrorsOf, kidsChallengeRegistrationSchema } from "@/lib/kids-challenge/registration-validation";
import { registerForKidsChallenge } from "@/lib/kids-challenge/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

/**
 * Register a student for the Kids Creative Challenge as the signed-in website user.
 * Same protection as workshop registration: DB-verified user session (SameSite=Lax cookie
 * blocks cross-site POSTs), per-account rate limit, strict validation and a honeypot field.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in to register for the challenge.", 401);
  const limited = await checkRateLimit(`kids-challenge-register:${user.id}`, 5, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
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
  // Honeypot filled → pretend success, store nothing (spam stays out silently).
  if (parsed.data.website) return NextResponse.json({ success: true, message: "Registration received." }, { status: 201, headers: NO_STORE });
  try {
    const result = await registerForKidsChallenge(user, parsed.data);
    if (!result.ok) {
      if (result.reason === "payment_pending") {
        // Registered earlier but not paid: the client takes payment for that registration.
        return NextResponse.json(
          {
            success: false,
            registrationId: result.registrationId,
            error: { code: "payment_pending", message: "This student is already registered. Complete the ₹99 payment to confirm." },
          },
          { status: 409, headers: NO_STORE },
        );
      }
      const message = "You have already registered this student.";
      return NextResponse.json(
        { success: false, error: { code: "already_registered", message, fields: { studentName: [message] } } },
        { status: 409, headers: NO_STORE },
      );
    }
    return NextResponse.json({ success: true, registrationId: result.registrationId, message: "Registration received." }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("[kids-challenge-registration] unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
