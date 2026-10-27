import { forgotPasswordSchema } from "@/lib/admin/validation";
import { requestUserPasswordReset } from "@/lib/user/auth-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Website-user forgot-password. Same answer whether or not the email has an account. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][forgot] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`user-forgot:${clientIp(request)}`, 5, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) return fail("validation_error", "Enter a valid email address.", 400);
  try {
    await requestUserPasswordReset(parsed.data.email);
    // Always the configured cooldown (never the per-account remainder) so the
    // response stays identical for registered and unknown emails.
    return ok({
      message: "If that email is registered, a reset code has been sent.",
      resendAvailableInSeconds: getAdminAuthConfig().otpResendCooldownSeconds,
    });
  } catch (err) {
    console.error("[user-auth][forgot] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
