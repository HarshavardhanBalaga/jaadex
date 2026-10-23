import { createHash } from "node:crypto";
import { rotateRefresh } from "@/lib/admin/session-auth";
import { validateCsrf } from "@/lib/admin/csrf";
import { checkRateLimit, clientIp } from "@/lib/admin/rate-limit";
import { accessCookieSpec, refreshCookieSpec, setAuthCookies, readAuthCookies } from "@/lib/admin/cookies";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

function hashMeta(v: string): string | null {
  if (!v) return null;
  return createHash("sha256").update(v, "utf8").digest("hex").slice(0, 32);
}

/** Refresh with atomic rotation + 30s benign-retry grace. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  const limited = await checkRateLimit(`refresh:${clientIp(request)}`, 30, 30).catch(() => null);
  if (limited && !limited.allowed) return fail("rate_limited", "Too many attempts. Try again later.", 429);
  const { refresh } = await readAuthCookies();
  if (!refresh) return fail("unauthenticated", "Session expired. Log in again.", 401);
  try {
    const r = await rotateRefresh(refresh, {
      ipHash: hashMeta(clientIp(request)),
      uaHash: hashMeta(request.headers.get("user-agent") ?? ""),
    });
    if (r.outcome === "ok") {
      await setAuthCookies([accessCookieSpec(r.accessToken), refreshCookieSpec(r.refreshToken)]);
      return ok({ message: "Session renewed." });
    }
    if (r.outcome === "grace") {
      await setAuthCookies([accessCookieSpec(r.accessToken)]);
      return ok({ message: "Session renewed." });
    }
    return fail("unauthenticated", "Session expired. Log in again.", 401);
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
