import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Protected profile. Safe fields only: never password/OTP/token hashes. */
export async function GET() {
  try {
    const { access } = await readAuthCookies();
    // No session cookie at all: answer 200 unauthenticated instead of 401 so
    // logged-out clients (e.g. navbar checks) don't spam console noise.
    // Genuinely invalid/expired tokens still get 401 below.
    if (!access) return ok({ authenticated: false });
    const checked = await requireAdminFromToken(access);
    if (!checked.ok) {
      if (checked.code === "auth_unavailable") {
        return fail("auth_unavailable", "Service temporarily unavailable.", 503);
      }
      // Not logged in (no/expired/invalid session): 200 + flag, never 401,
      // so routine logged-out checks stay out of console noise. A valid
      // session with insufficient role is still a real 403.
      if (checked.code !== "forbidden") return ok({ authenticated: false });
      return fail("forbidden", "Access denied.", 403);
    }
    const a = checked.ctx.admin;
    return ok({
      authenticated: true,
      admin: {
        name: a.name ?? "",
        email: a.email,
        role: a.role,
        status: a.status,
        emailVerifiedAt: a.emailVerifiedAt,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      },
    });
  } catch (err) {
    console.error("[admin-auth][me] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
