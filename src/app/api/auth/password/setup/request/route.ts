import { forgotPasswordSchema } from "@/lib/admin/validation";
import { requestUserPasswordSetup } from "@/lib/user/auth-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/**
 * Starts adding a password to a Google-only account (not registration, not reset).
 * Same answer whether or not the email is eligible, so it reveals nothing.
 */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][setup-request] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`user-setup:${clientIp(request)}`, 5, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) return fail("validation_error", "Enter a valid email address.", 400);
  try {
    await requestUserPasswordSetup(parsed.data.email);
    return ok({
      message: "If this email uses Google sign-in without a password, we've sent a setup code.",
      resendAvailableInSeconds: getAdminAuthConfig().otpResendCooldownSeconds,
    });
  } catch (err) {
    console.error("[user-auth][setup-request] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
