import { getCurrentUser } from "@/lib/user/session";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Current website user. 200 + authenticated flag even when logged out (no console noise). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ authenticated: false });
    return ok({ authenticated: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error("[user-auth][me] unavailable:", err instanceof Error ? err.message : err);
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
