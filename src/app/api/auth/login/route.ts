import { loginSchema } from "@/lib/admin/validation";
import { loginUser } from "@/lib/user/auth-service";
import { createUserSession } from "@/lib/user/session";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { hashMeta } from "@/lib/admin/request-meta";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Website-user login. Generic errors; HTTP-only session cookie; no token in body. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    console.error("[user-auth][login] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const ip = clientIp(request);
  const limited = await checkRateLimit(`user-login:${ip}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) return fail("invalid_credentials", "Invalid email or password.", 401);
  const emailLimited = await checkRateLimit(`user-login-email:${parsed.data.email}`, 10, 30).catch(() => null);
  if (emailLimited && !emailLimited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  try {
    const r = await loginUser(parsed.data.email, parsed.data.password);
    if (r.outcome === "no_account") {
      return fail("no_account", "No account found for this email. Please register.", 404);
    }
    if (r.outcome !== "ok") return fail("invalid_credentials", "Invalid email or password.", 401);
    await createUserSession(r.userId, {
      ipHash: hashMeta(ip),
      uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
    });
    return ok({ message: "Logged in." });
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
