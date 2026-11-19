import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail, ok } from "@/lib/admin/respond";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { adminAnalyticsQuerySchema } from "@/lib/kids-challenge/admin-validation";
import { getKidsChallengeAnalytics } from "@/lib/kids-challenge/admin-service";

export const dynamic = "force-dynamic";

/** Admin-only: Kids Challenge KPIs, daily trend and breakdowns. Query: days (7|30|90). */
export async function GET(request: Request) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const parsed = adminAnalyticsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail("validation_error", "Invalid analytics parameters.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    return ok({ analytics: await getKidsChallengeAnalytics(parsed.data.days) });
  } catch (err) {
    console.error("[kids-challenge-admin] analytics unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
