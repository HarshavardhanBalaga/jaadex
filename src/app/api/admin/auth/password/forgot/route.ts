import { forgotPasswordSchema } from "@/lib/admin/validation";
import { requestPasswordReset } from "@/lib/admin/password-reset-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Public forgot-password. Always returns success so emails can't be enumerated. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[admin-auth][forgot] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`forgot:${clientIp(request)}`, 5, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) return fail("validation_error", "Enter a valid email address.", 400);
  try {
    const r = await requestPasswordReset(parsed.data.email);
    if (r.outcome === "cooldown") {
      return ok({
        message: "If that email is registered, a code is on its way.",
        resendAvailableInSeconds: r.resendAvailableInSeconds,
      });
    }
    return ok({
      message: "If that email is registered, a reset code has been sent.",
      resendAvailableInSeconds: r.resendAvailableInSeconds,
    });
  } catch (err) {
    console.error("[admin-auth][forgot] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
