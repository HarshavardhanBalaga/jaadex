import { NextResponse } from "next/server";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { readAuthCookies } from "@/lib/admin/cookies";
import { fail } from "@/lib/admin/respond";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { adminPaymentsQuerySchema } from "@/lib/kids-challenge/admin-validation";
import { listAdminPayments } from "@/lib/kids-challenge/admin-service";
import { buildPaymentsCsv, PAYMENTS_CSV_FILENAME } from "@/lib/kids-challenge/payments-csv";

export const dynamic = "force-dynamic";

/** Admin-only CSV of the payment history, honouring the same filters as the list (q, status, method, from, to). */
export async function GET(request: Request) {
  const { access } = await readAuthCookies();
  const checked = await requireAdminFromToken(access);
  if (!checked.ok) return fail(checked.code, "Not authorised.", checked.status);
  const parsed = adminPaymentsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail("validation_error", "Invalid export parameters.", 400, { fields: fieldErrorsOf(parsed.error) });
  try {
    const csv = buildPaymentsCsv(await listAdminPayments(parsed.data));
    return new NextResponse(csv, {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${PAYMENTS_CSV_FILENAME}"`,
      },
    });
  } catch (err) {
    console.error("[kids-challenge-admin] payments export unavailable:", err instanceof Error ? err.message : err);
    return fail("unavailable", "Service temporarily unavailable. Try again later.", 503);
  }
}
