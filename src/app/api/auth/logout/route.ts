import { revokeCurrentUserSession } from "@/lib/user/session";
import { validateCsrf } from "@/lib/admin/csrf";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/**
 * Website-user logout: revoke session, clear cookie. A failed CSRF check is
 * reported (not swallowed) so the client retries with a fresh token instead
 * of believing it logged out while the session lives on.
 */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return fail("csrf_invalid", "Security check failed. Refresh and try again.", 403);
  await revokeCurrentUserSession().catch(() => undefined);
  return ok({ message: "Logged out." });
}
