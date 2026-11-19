import { userSetupPasswordSchema } from "@/lib/user/validation";
import { setupUserPassword } from "@/lib/user/auth-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Adds a password to an existing Google account with the emailed setup code. Generic errors. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][setup-confirm] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`user-setup-confirm:${clientIp(request)}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = userSetupPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return fail("validation_error", "Check the highlighted fields.", 400, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const r = await setupUserPassword(parsed.data.email, parsed.data.otp, parsed.data.newPassword);
    if (r.outcome === "set") {
      return ok({ message: "Password set. You can now log in with your email and password, or keep using Google." });
    }
    if (r.outcome === "expired") return fail("otp_expired", "Code expired. Request a new one.", 400);
    if (r.outcome === "locked") return fail("otp_locked", "Too many wrong attempts. Request a new code.", 403);
    return fail("otp_invalid", "Invalid code or email.", 400, r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : undefined);
  } catch (err) {
    console.error("[user-auth][setup-confirm] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
