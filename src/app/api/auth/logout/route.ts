import { revokeCurrentUserSession } from "@/lib/user/session";
import { validateCsrf } from "@/lib/admin/csrf";
import { ok } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Website-user logout: revoke session, clear cookie. Always succeeds. */
export async function POST(request: Request) {
  const csrfError = await validateCsrf(request);
  if (csrfError) return ok({ message: "Logged out." });
  await revokeCurrentUserSession().catch(() => undefined);
  return ok({ message: "Logged out." });
}
