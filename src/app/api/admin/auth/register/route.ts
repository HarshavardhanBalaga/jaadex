import { registerSchema } from "@/lib/admin/validation";
import { registerBootstrap } from "@/lib/admin/register-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Public registration. Any email may register; accounts stay pending until OTP verification. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[admin-auth][register] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`register:${clientIp(request)}`, 5, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return fail("validation_error", "Check the highlighted fields.", 400, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const result = await registerBootstrap(parsed.data.name, parsed.data.email, parsed.data.password);
    if (result.outcome === "created") {
      return ok({ message: "Verification code sent. Check the administrator inbox.", resendAvailableInSeconds: result.resendAvailableInSeconds }, 201);
    }
    if (result.outcome === "already_pending") {
      return ok({ message: "A verification code was already sent.", resendAvailableInSeconds: result.resendAvailableInSeconds });
    }
    if (result.outcome === "email_taken") {
      // Outcome only — never log the email address.
      console.error("[admin-auth][register] outcome: email_taken");
      return fail("email_taken", "This email is already registered. Please log in.", 409);
    }
    if (result.outcome === "resend_limit") {
      return fail("rate_limited", "Too many codes sent. Try again later.", 429);
    }
    console.error("[admin-auth][register] outcome:", result.outcome);
    return fail("registration_unavailable", "Registration is unavailable.", 403);
  } catch (err) {
    console.error("[admin-auth][register] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
