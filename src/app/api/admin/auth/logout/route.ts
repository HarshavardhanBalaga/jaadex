import { revokeFamily } from "@/lib/admin/session-revoke";
import { verifyRefreshToken } from "@/lib/admin/jwt";
import { validateCsrf } from "@/lib/admin/csrf";
import { clearAuthCookies, readAuthCookies } from "@/lib/admin/cookies";
import { ok } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Logout: revoke family, clear cookies. Always succeeds (safe for expired sessions). */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) {
    return ok({ message: "Logged out." });
  }
  try {
    const { refresh } = await readAuthCookies();
    if (refresh) {
      const claims = verifyRefreshToken(refresh);
      if (claims) await revokeFamily(claims.fid, "logout");
    }
  } catch {
    // fall through to cookie clear
  }
  await clearAuthCookies().catch(() => undefined);
  return ok({ message: "Logged out." });
}
