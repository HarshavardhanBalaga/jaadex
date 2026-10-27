import { verifyOtpSchema } from "@/lib/admin/validation";
import { verifyUserOtp } from "@/lib/user/auth-service";
import { createUserSession } from "@/lib/user/session";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { hashMeta } from "@/lib/admin/request-meta";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Activates a pending user exactly once and signs them in. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][verify-otp] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const ip = clientIp(request);
  const limited = await checkRateLimit(`user-verify:${ip}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = verifyOtpSchema.safeParse(data);
  if (!parsed.success) return fail("validation_error", "Enter the code sent to your email.", 400);
  try {
    const r = await verifyUserOtp(parsed.data.email, parsed.data.otp);
    if (r.outcome === "verified") {
      await createUserSession(r.userId, {
        ipHash: hashMeta(ip),
        uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
      });
      return ok({ message: "Account verified. You are now logged in." });
    }
    if (r.outcome === "expired") return fail("otp_expired", "Code expired. Register again to get a new code.", 400);
    if (r.outcome === "locked") return fail("otp_locked", "Too many wrong attempts. Register again.", 403);
    if (r.outcome === "not_found") return fail("otp_invalid", "Invalid code or email.", 400);
    return fail("otp_invalid", "Invalid code.", 400, r.attemptsLeft !== undefined ? { attemptsLeft: r.attemptsLeft } : undefined);
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
