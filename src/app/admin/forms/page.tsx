import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { listWorkshopsWithFormStatus, type WorkshopFormRow } from "@/lib/workshop-forms/service";
import { WorkshopFormsTable } from "@/components/admin/forms/WorkshopFormsTable";

export const metadata: Metadata = { title: "Forms", description: "Manage workshop forms." };
export const dynamic = "force-dynamic";

/** Server-protected: proxy redirect is UX only; this check is the boundary. */
export default async function AdminFormsPage() {
  let checked: Awaited<ReturnType<typeof requireAdminFromToken>>;
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
  } catch {
    redirect("/admin/login");
  }
  if (!checked.ok) redirect("/admin/login");

  let rows: WorkshopFormRow[] | null = null;
  try {
    rows = await listWorkshopsWithFormStatus();
  } catch (err) {
    console.error("[admin/forms] list failed:", err instanceof Error ? err.message : err);
  }

  return (
    <div className="min-h-[calc(100vh-106px)] bg-[#f3f6fd] md:min-h-[calc(100vh-114px)]">
      <main className="mx-auto w-full max-w-[1180px] px-6 py-10 md:px-10">
        <header>
          <Link href="/admin/dashboard" className="text-[13px] font-semibold text-royal hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-3 font-display text-[26px] leading-none font-bold tracking-[-0.5px] text-navy md:text-[30px]">Forms</h1>
          <p className="mt-2 text-[14px] text-muted">
            Manage forms for your workshops. Create, edit, and manage responses from one place.
          </p>
        </header>
        <div className="mt-8">
          {rows ? (
            <WorkshopFormsTable rows={rows} />
          ) : (
            <p className="rounded-2xl border border-line bg-white px-5 py-10 text-center text-[14px] text-[#c1440e] shadow-soft">
              Workshops could not be loaded. Refresh the page to try again.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
