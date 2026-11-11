import { NextResponse, after } from "next/server";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/user/session";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { checkRateLimit } from "@/lib/admin/rate-limit";
import { fieldErrorsOf, registrationListQuerySchema, registrationSchema } from "@/lib/workshops/registration-validation";
import { queryRegistrations, registerForWorkshop, sendRegistrationConfirmation } from "@/lib/workshops/registration-service";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: NO_STORE });
}

const REFUSED = {
  not_found: ["not_found", "This workshop no longer exists.", 404],
  closed: ["registration_closed", "Registration for this workshop is closed.", 409],
  completed: ["workshop_completed", "This workshop has already taken place.", 409],
  full: ["registration_full", "Sorry — all seats for this workshop are taken.", 409],
  already_registered: ["already_registered", "You're already registered for this workshop.", 409],
} as const;

/**
 * Register the signed-in website user. Same protection as /api/contact:
 * DB-verified user session (SameSite=Lax cookie blocks cross-site POSTs),
 * per-account rate limit, strict validation and a honeypot field.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return fail("unauthenticated", "Please log in to register for this workshop.", 401);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  const limited = await checkRateLimit(`workshop-register:${user.id}`, 5, 60).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", "Invalid request body.", 400);
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "validation_error", message: "Check the highlighted fields.", fields: fieldErrorsOf(parsed.error) } },
      { status: 400, headers: NO_STORE },
    );
  }
  // Honeypot filled → pretend success, store nothing (spam stays out silently).
  if (parsed.data.website) return NextResponse.json({ success: true, message: "You're registered." }, { status: 201, headers: NO_STORE });
  try {
    const result = await registerForWorkshop(id, user, parsed.data);
    if (!result.ok) {
      if (result.reason === "contact_taken") {
        // Field-level, so the form highlights the email or phone that is already used.
        const message = `This ${result.field === "email" ? "email" : "phone number"} is already registered for this workshop.`;
        return NextResponse.json(
          { success: false, error: { code: "contact_already_registered", message, fields: { [result.field]: [message] } } },
          { status: 409, headers: NO_STORE },
        );
      }
      const [code, message, status] = REFUSED[result.reason];
      return fail(code, message, status);
    }
    // Email after the response is sent: SMTP latency never slows the registrant, and a mail
    // failure never undoes a saved registration. The outcome is recorded on the row for admins.
    const { registrationId } = result;
    after(() =>
      sendRegistrationConfirmation(registrationId).catch((err) =>
        console.error("[workshop-registration] confirmation email error:", err instanceof Error ? err.message : err),
      ),
    );
    return NextResponse.json({ success: true, message: "You're registered." }, { status: 201, headers: NO_STORE });
  } catch (err) {
    console.error("[workshop-registration] unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}

/**
 * Admin-only: one page of this workshop's registrations.
 * Query: page, limit (10/25/50/100), q (name/email/phone), email (confirmation status), sort (createdAt|name), order (asc|desc).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const { id } = await context.params;
  if (!isValidObjectId(id)) return fail("invalid_request", "Invalid workshop id.", 400);
  const parsed = registrationListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "validation_error", message: "Invalid list parameters.", fields: fieldErrorsOf(parsed.error) } },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const { registrations, pagination } = await queryRegistrations(id, parsed.data);
    return NextResponse.json(
      {
        success: true,
        registrations: registrations.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), emailSentAt: r.emailSentAt?.toISOString() ?? null })),
        pagination,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[workshop-registration] list unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
