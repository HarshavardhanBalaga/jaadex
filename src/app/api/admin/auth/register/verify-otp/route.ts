import { verifyOtpSchema } from "@/lib/admin/validation";
import { verifyRegistrationOtp } from "@/lib/admin/session-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Public OTP verification. Activates a pending admin exactly once. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[admin-auth][verify-otp] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`verify:${clientIp(request)}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = verifyOtpSchema.safeParse(data);
  if (!parsed.success) return fail("validation_error", "Enter the code sent to the administrator inbox.", 400);
  try {
    const r = await verifyRegistrationOtp(parsed.data.email, parsed.data.otp);
    if (r.outcome === "verified") {
      return ok({ message: "Admin account activated. You can now log in." });
    }
    if (r.outcome === "expired") return fail("otp_expired", "Code expired. Register again to get a new code.", 400);
    if (r.outcome === "locked") return fail("otp_locked", "Too many wrong attempts. Register again.", 403);
    if (r.outcome === "not_found" || r.outcome === "email_mismatch") {
      return fail("otp_invalid", "Invalid code or email.", 400);
    }
    return fail("otp_invalid", "Invalid code.", 400, r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : undefined);
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
