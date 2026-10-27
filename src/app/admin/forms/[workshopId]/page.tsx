import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidObjectId } from "mongoose";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { getWorkshopWithForm } from "@/lib/workshop-forms/service";
import { FormBuilder } from "@/components/admin/forms/FormBuilder";

export const metadata: Metadata = { title: "Form builder", description: "Build the registration form for a workshop." };
export const dynamic = "force-dynamic";

/** Server-protected: proxy redirect is UX only; this check is the boundary. */
export default async function AdminWorkshopFormPage({ params }: { params: Promise<{ workshopId: string }> }) {
  const { workshopId } = await params;
  if (!isValidObjectId(workshopId)) notFound();

  let checked: Awaited<ReturnType<typeof requireAdminFromToken>>;
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
  } catch {
    redirect("/admin/login");
  }
  if (!checked.ok) redirect("/admin/login");

  let data: Awaited<ReturnType<typeof getWorkshopWithForm>>;
  try {
    data = await getWorkshopWithForm(workshopId);
  } catch (err) {
    console.error("[admin/forms] load failed:", err instanceof Error ? err.message : err);
    return (
      <div className="min-h-[calc(100vh-106px)] bg-[#f3f6fd] px-6 py-10 md:min-h-[calc(100vh-114px)] md:px-10">
        <p className="text-[14px] text-[#c1440e]">This workshop could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }
  if (!data) notFound();

  return (
    <div className="min-h-[calc(100vh-106px)] bg-[#f3f6fd] md:min-h-[calc(100vh-114px)]">
      <main className="mx-auto w-full max-w-[1180px] px-6 py-10 md:px-10">
        <FormBuilder
          workshopId={data.workshop.id}
          workshopTitle={data.workshop.title}
          initialSchema={data.form?.schema ?? null}
        />
      </main>
    </div>
  );
}
