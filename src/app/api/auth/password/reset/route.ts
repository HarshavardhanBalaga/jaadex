import { resetPasswordSchema } from "@/lib/admin/validation";
import { resetUserPassword } from "@/lib/user/auth-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Website-user password reset with emailed code. Generic errors; all sessions revoked on success. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][reset] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`user-reset:${clientIp(request)}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return fail("validation_error", "Check the highlighted fields.", 400, {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  try {
    const r = await resetUserPassword(parsed.data.email, parsed.data.otp, parsed.data.newPassword);
    if (r.outcome === "reset") return ok({ message: "Password updated. Please log in with your new password." });
    if (r.outcome === "expired") return fail("otp_expired", "Code expired. Request a new one.", 400);
    if (r.outcome === "locked") return fail("otp_locked", "Too many wrong attempts. Request a new code.", 403);
    return fail("otp_invalid", "Invalid code or email.", 400, r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : undefined);
  } catch (err) {
    console.error("[user-auth][reset] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
