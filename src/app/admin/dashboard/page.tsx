import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { formatDateTime } from "@/lib/format";
import { AdminModel } from "@/models/Admin";
import { DemoRequestModel } from "@/models/DemoRequest";
import { WorkshopModel } from "@/models/Workshop";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdministratorsTable, type AdministratorRow } from "@/components/admin/AdministratorsTable";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { EnquiriesTable, type EnquiryRow } from "@/components/admin/EnquiriesTable";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { WorkshopList, type WorkshopListItem } from "@/components/admin/WorkshopList";

export const metadata: Metadata = { title: "Admin Dashboard", description: "JaaDeX admin dashboard." };
export const dynamic = "force-dynamic";

/**
 * Loads everything the dashboard shows. Returns null when the session is not
 * an active admin. Admin-only: this is the server-side authorization boundary.
 */
async function loadDashboard() {
  const c = getAdminAuthConfig();
  const store = await cookies();
  const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
  if (!checked.ok) return null;

  const [adminDocs, requestDocs, workshopDocs] = await Promise.all([
    AdminModel.find({})
      .select({ name: 1, email: 1, role: 1, status: 1, lastLoginAt: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean(),
    DemoRequestModel.find({})
      .select({ name: 1, email: 1, organization: 1, interest: 1, message: 1, status: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    WorkshopModel.find({})
      .select({ title: 1, description: 1, date: 1, location: 1, image: 1 })
      .sort({ date: -1 })
      .lean(),
  ]);

  const admins: AdministratorRow[] = adminDocs.map((d) => ({
    name: d.name ?? "—",
    email: d.email,
    role: d.role,
    status: d.status,
    lastLoginAt: d.lastLoginAt ? new Date(d.lastLoginAt) : null,
    createdAt: d.createdAt ? new Date(d.createdAt) : null,
  }));

  const requests: EnquiryRow[] = requestDocs.map((d) => ({
    name: d.name,
    email: d.email,
    organization: d.organization || "—",
    interest: d.interest,
    message: d.message,
    status: d.status,
    createdAt: d.createdAt ? new Date(d.createdAt) : null,
  }));

  const workshops: WorkshopListItem[] = workshopDocs.map((d) => ({
    id: String(d._id),
    title: d.title,
    description: d.description,
    date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
    location: d.location,
    image: d.image,
  }));

  const upcoming = workshops.filter((w) => new Date(w.date).getTime() >= Date.now()).length;

  return {
    admin: checked.ctx.admin,
    admins,
    requests,
    workshops,
    upcoming,
  };
}

export default async function AdminDashboardPage() {
  let dashboard: Awaited<ReturnType<typeof loadDashboard>>;
  try {
    dashboard = await loadDashboard();
  } catch {
    redirect("/admin/login");
  }
  if (!dashboard) redirect("/admin/login");

  const { admin, admins, requests, workshops, upcoming } = dashboard;
  const lastLoginAt = admin.lastLoginAt ? new Date(admin.lastLoginAt) : null;
  const newRequests = requests.filter((r) => r.status === "new").length;
  const activeAdmins = admins.filter((a) => a.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              {admin.email} · {admin.role} · last login {formatDateTime(lastLoginAt)}
            </p>
            {!admin.emailVerifiedAt && (
              <p className="mt-2 text-xs font-semibold text-red-700">
                Email not verified — verify it to keep this account secure.
              </p>
            )}
          </div>
          <AdminLogoutButton />
        </header>

        <section aria-label="Overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatCard
            label="New enquiries"
            value={String(newRequests)}
            hint={`${requests.length} total received`}
            href="#enquiries"
            highlight
          />
          <AdminStatCard label="Workshops" value={String(workshops.length)} hint={`${upcoming} upcoming`} href="#workshops" />
          <AdminStatCard label="Administrators" value={String(admins.length)} hint={`${activeAdmins} active`} href="#administrators" />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6">
            <AdminSection title="Publish workshop" subtitle="Appears on the Workshops page after publishing.">
              <div className="p-5">
                <WorkshopForm />
              </div>
            </AdminSection>
          </aside>

          <div className="min-w-0 space-y-6">
            <AdminSection
              id="enquiries"
              title="Demo and contact requests"
              subtitle="Newest first. Visible only to admins."
            >
              <EnquiriesTable requests={requests} />
            </AdminSection>

            <AdminSection id="workshops" title="Published workshops" subtitle="Currently on the calendar.">
              <WorkshopList workshops={workshops} />
            </AdminSection>

            <AdminSection id="administrators" title="Administrators" subtitle="Accounts and recent logins.">
              <AdministratorsTable admins={admins} />
            </AdminSection>
          </div>
        </div>

        <p className="text-xs text-slate-500">Sessions expire automatically. Log out when finished.</p>
      </div>
    </div>
  );
}
