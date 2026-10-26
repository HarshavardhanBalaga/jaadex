import { loginSchema } from "@/lib/admin/validation";
import { loginAdmin } from "@/lib/admin/session-auth";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { accessCookieSpec, refreshCookieSpec, setAuthCookies } from "@/lib/admin/cookies";
import { hashMeta } from "@/lib/admin/request-meta";
import { ok, fail, readJson } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Public login. Generic errors; HTTP-only cookies; no tokens in body. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    // Client keeps a generic message (don't reveal which check failed);
    // the sub-code goes to server logs only for diagnosis.
    console.error("[admin-auth][login] csrf:", csrfError);
    return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  }
  const ip = clientIp(request);
  const limited = await checkRateLimit(`login:${ip}`, 10, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { data, error } = await readJson(request);
  if (error) return fail("invalid_request", "Invalid request body.", 400);
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) return fail("invalid_credentials", "Invalid email or password.", 401);
  const emailLimited = await checkRateLimit(
    `login-email:${parsed.data.email.toLowerCase()}`,
    10,
    30,
  ).catch(() => null);
  if (emailLimited && !emailLimited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  try {
    const r = await loginAdmin(parsed.data.email, parsed.data.password, {
      ipHash: hashMeta(ip),
      uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
    });
    if (r.outcome !== "ok") return fail("invalid_credentials", "Invalid email or password.", 401);
    await setAuthCookies([accessCookieSpec(r.accessToken), refreshCookieSpec(r.refreshToken)]);
    return ok({ message: "Logged in." });
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
