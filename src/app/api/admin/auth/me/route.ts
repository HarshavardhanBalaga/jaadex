import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Protected profile. Safe fields only: never password/OTP/token hashes. */
export async function GET() {
  try {
    const { access } = await readAuthCookies();
    const checked = await requireAdminFromToken(access);
    if (!checked.ok) {
      if (checked.code === "auth_unavailable") {
        return fail("auth_unavailable", "Service temporarily unavailable.", 503);
      }
      const status = checked.status === 403 ? 403 : 401;
      const code = checked.status === 403 ? "forbidden" : "unauthenticated";
      return fail(code, code === "forbidden" ? "Access denied." : "Log in to continue.", status);
    }
    const a = checked.ctx.admin;
    return ok({
      admin: {
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
