import { bootstrapStatus } from "@/lib/admin/register-service";
import { ok, fail } from "@/lib/admin/respond";

export const dynamic = "force-dynamic";

/** Public: whether admin registration is currently open. No email leaked. */
export async function GET() {
  try {
    const s = await bootstrapStatus();
    return ok({ registered: s.registered, registrationOpen: s.registrationOpen });
  } catch {
    return fail("auth_unavailable", "Service temporarily unavailable.", 503);
  }
}
