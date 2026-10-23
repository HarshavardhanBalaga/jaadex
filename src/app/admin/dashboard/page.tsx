import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { AdminModel } from "@/models/Admin";
import { DemoRequestModel } from "@/models/DemoRequest";
import { WorkshopModel } from "@/models/Workshop";
import { Container } from "@/components/Container";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { WorkshopList, type WorkshopListItem } from "@/components/admin/WorkshopList";

export const metadata: Metadata = { title: "Admin Dashboard", description: "JaaDeX admin dashboard." };
export const dynamic = "force-dynamic";

function fmt(value: Date | string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function StatCard({ label, value, hint, href, tint }: { label: string; value: string; hint: string; href?: string; tint?: boolean }) {
  const body = (
    <div>
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-[28px] leading-none font-bold text-navy">{value}</p>
      <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
    </div>
  );
  const frame = `rounded-2xl border p-5 ${tint ? "border-royal/25 bg-[#e9efff]" : "border-line bg-white"}`;
  return href ? (
    <a href={href} className={`${frame} block transition-colors hover:border-royal/50`}>
      {body}
    </a>
  ) : (
    <div className={frame}>{body}</div>
  );
}

function Card({ title, subtitle, children, action, tint }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; tint?: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 ${tint ? "bg-[#eef3ff]" : ""}`}>
        <div>
          <h3 className="font-display text-[16px] font-bold text-navy">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Server-protected: proxy redirect is UX only; this check is the boundary. */
export default async function AdminDashboardPage() {
  let email = "";
  let role = "";
  let lastLoginAt: Date | null = null;
  let verifiedAt: Date | null = null;
  // Allowlisted login tracking: who holds an account + when each last logged in.
  let allAdmins: Array<{ name: string; email: string; role: string; status: string; lastLoginAt: Date | null; createdAt: Date | null }> = [];
  // Demo & contact enquiries: newest first. Admin eyes only — this page is server-guarded.
  let requests: Array<{ name: string; email: string; organization: string; interest: string; message: string; status: string; createdAt: Date | null }> = [];
  // Published workshops for the calendar (create + manage below).
  let workshops: WorkshopListItem[] = [];
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
    if (!checked.ok) redirect("/admin/login");
    email = checked.ctx.admin.email;
    role = checked.ctx.admin.role;
    lastLoginAt = checked.ctx.admin.lastLoginAt ? new Date(checked.ctx.admin.lastLoginAt) : null;
    verifiedAt = checked.ctx.admin.emailVerifiedAt ? new Date(checked.ctx.admin.emailVerifiedAt) : null;
    const docs = await AdminModel.find({})
      .select({ name: 1, email: 1, role: 1, status: 1, lastLoginAt: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();
    allAdmins = docs.map((d) => ({
      name: d.name ?? "—",
      email: d.email,
      role: d.role,
      status: d.status,
      lastLoginAt: d.lastLoginAt ? new Date(d.lastLoginAt) : null,
      createdAt: d.createdAt ? new Date(d.createdAt) : null,
    }));
    const reqDocs = await DemoRequestModel.find({})
      .select({ name: 1, email: 1, organization: 1, interest: 1, message: 1, status: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    requests = reqDocs.map((d) => ({
      name: d.name,
      email: d.email,
      organization: d.organization || "—",
      interest: d.interest,
      message: d.message,
      status: d.status,
      createdAt: d.createdAt ? new Date(d.createdAt) : null,
    }));
    const wsDocs = await WorkshopModel.find({})
      .select({ title: 1, description: 1, date: 1, location: 1, image: 1 })
      .sort({ date: -1 })
      .lean();
    workshops = wsDocs.map((d) => ({
      id: String(d._id),
      title: d.title,
      description: d.description,
      date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
      location: d.location,
      image: d.image,
    }));
  } catch {
    redirect("/admin/login");
  }
  const newRequests = requests.filter((r) => r.status === "new").length;
  const activeAdmins = allAdmins.filter((a) => a.status === "active").length;
  const upcoming = workshops.filter((w) => new Date(w.date).getTime() >= Date.now()).length;
  return (
    <div className="bg-[#f3f6fd]">
    <Container className="max-w-[1180px] py-[32px] md:py-[44px]">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] leading-none font-bold tracking-[-0.5px] text-navy md:text-[30px]">
            Dashboard
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {email} · {role} · last login {fmt(lastLoginAt)}
          </p>
          {!verifiedAt && (
            <p className="mt-2 text-[12px] font-semibold text-[#c1440e]">
              Email not verified — verify it to keep this account secure.
            </p>
          )}
        </div>
        <AdminLogoutButton />
      </header>

      {/* Overview */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Overview">
        <StatCard label="New enquiries" value={String(newRequests)} hint={`${requests.length} total received`} href="#enquiries" tint />
        <StatCard label="Workshops" value={String(workshops.length)} hint={`${upcoming} upcoming`} href="#workshops" />
        <StatCard label="Administrators" value={String(allAdmins.length)} hint={`${activeAdmins} active`} href="#administrators" />
      </section>

      {/* Workspace — sidebar holds the do-this-now Actions rail; main column holds the ledgers. */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6">
      {/* Actions */}
      <section aria-label="Actions">
        <Card title="Actions" subtitle="Admin-only. Stays closed until opened." tint>
          <details className="px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-royal/40">
              <span>
                <span className="block text-[14px] font-semibold text-navy">Publish workshop</span>
                <span className="block text-[12px] text-muted">Appears on the Workshops page after publishing.</span>
              </span>
              <span className="shrink-0 rounded-full bg-royal px-4 py-1.5 text-[12px] font-semibold text-white" aria-hidden="true">Open</span>
            </summary>
            <div className="mt-4">
              <WorkshopForm />
            </div>
          </details>
        </Card>
      </section>
        </aside>

        <div className="grid min-w-0 grid-cols-1 items-start gap-6">
      {/* Enquiries */}
      <div id="enquiries" className="scroll-mt-6">
        <Card title="Demo and contact requests" subtitle="Newest first. Visible only to admins.">
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No enquiries yet. New Book-a-Demo and contact submissions will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Organization</th>
                    <th className="px-5 py-3">Interest</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {requests.map((r, i) => (
                    <tr key={`${r.email}-${r.createdAt?.toISOString() ?? i}`}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.status === "new" ? (
                          <span className="font-semibold text-navy">New</span>
                        ) : (
                          <span className="text-muted">{r.status}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-navy break-all">{r.name}</td>
                      <td className="px-5 py-3 text-muted break-all">{r.email}</td>
                      <td className="px-5 py-3 text-muted break-all">{r.organization}</td>
                      <td className="px-5 py-3 text-muted break-all">{r.interest}</td>
                      <td className="max-w-[320px] px-5 py-3 text-muted wrap-break-word">{r.message}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted">{fmt(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {/* Workshops */}
      <div className="mt-6" id="workshops">
        <Card title="Published workshops" subtitle="Currently on the calendar.">
          <WorkshopList workshops={workshops} />
        </Card>
      </div>

      {/* Administrators */}
      <div className="mt-6" id="administrators">
        <Card title="Administrators" subtitle="Accounts and recent logins.">
          <details className="px-5 py-4">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-navy">
              Show all {allAdmins.length} administrators
            </summary>
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last login</th>
                    <th className="px-5 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {allAdmins.map((a) => (
                    <tr key={a.email}>
                      <td className="px-5 py-3 text-navy break-all">{a.name}</td>
                      <td className="px-5 py-3 text-navy break-all">{a.email}</td>
                      <td className="px-5 py-3 text-muted">{a.role}</td>
                      <td className="px-5 py-3 text-muted">{a.status}</td>
                      <td className="px-5 py-3 text-muted">{fmt(a.lastLoginAt)}</td>
                      <td className="px-5 py-3 text-muted">{fmt(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
        </div>
      </div>
      </div>

      <p className="mt-6 text-[12px] text-muted">Sessions expire automatically. Log out when finished.</p>
      </Container>
    </div>
  );
}