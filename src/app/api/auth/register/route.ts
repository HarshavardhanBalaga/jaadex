import { registerSchema } from "@/lib/admin/validation";
import { registerUser } from "@/lib/user/auth-service";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Website-user registration. Account stays pending until the emailed code is verified. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][register] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const limited = await checkRateLimit(`user-register:${clientIp(request)}`, 5, 30).catch(() => null);
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
    const result = await registerUser(parsed.data.name, parsed.data.email, parsed.data.password);
    if (result.outcome === "sent") {
      return ok({ message: "Verification code sent. Check your email.", resendAvailableInSeconds: result.resendAvailableInSeconds }, 201);
    }
    if (result.outcome === "cooldown") {
      return ok({ message: "A verification code was already sent. Check your email.", resendAvailableInSeconds: result.resendAvailableInSeconds });
    }
    if (result.outcome === "email_taken") {
      return fail("email_taken", "This email is already registered. Please log in.", 409);
    }
    return fail("rate_limited", "Too many codes sent. Try again later.", 429);
  } catch (err) {
    console.error("[user-auth][register] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
