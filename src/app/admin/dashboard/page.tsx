import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { AdminModel } from "@/models/Admin";
import { DemoRequestModel } from "@/models/DemoRequest";
import { isWorkshopUpcoming } from "@/lib/workshops/format";
import { listWorkshops } from "@/lib/workshops/queries";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { Icon } from "@/components/Icon";
import { AdminDashboardShell, type AdminSection } from "@/components/admin/AdminDashboardShell";
import { WorkshopList, type WorkshopListItem } from "@/components/admin/WorkshopList";
import { interests, workshopInterest } from "@/lib/contact/validation";

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

/** Each stat gets a brand-colored icon chip. */
const accentStyles = {
  royal: { chip: "bg-royal/10 text-royal" },
  orange: { chip: "bg-orange/10 text-orange-dark" },
  green: { chip: "bg-green/10 text-green" },
} as const;

function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  icon: NonNullable<AdminSection["icon"]>;
  accent: keyof typeof accentStyles;
}) {
  const style = accentStyles[accent];
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[1.2px] text-muted uppercase">{label}</p>
          <p className="mt-3 font-display text-[34px] leading-none font-bold tabular-nums text-navy">{value}</p>
          <p className="mt-2.5 text-[12px] text-muted">{hint}</p>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${style.chip}`}>
          <Icon name={icon} size={20} />
        </span>
      </div>
    </>
  );
  const frame = "relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card";
  return href ? (
    <a href={href} className={`${frame} block transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover`}>
      {body}
    </a>
  ) : (
    <div className={frame}>{body}</div>
  );
}

function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3.5">
        <div>
          <h3 className="font-display text-[17px] font-bold text-navy">{title}</h3>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Server-protected: proxy redirect is UX only; this check is the boundary. */
export default async function AdminDashboardPage() {
  let verifiedAt: Date | null = null;
  // Allowlisted login tracking: who holds an account + when each last logged in.
  let allAdmins: Array<{ name: string; email: string; role: string; status: string; lastLoginAt: Date | null; createdAt: Date | null }> = [];
  // Demo & contact enquiries: newest first. Admin eyes only — this page is server-guarded.
  let requests: Array<{ name: string; email: string; organization: string; interest: string; message: string; status: string; createdAt: Date | null }> = [];
  // Published workshops for the calendar (create + manage below).
  let workshops: WorkshopListItem[] = [];
  // Submission counts per form topic, across all requests (not just the newest 50).
  let topicCounts = new Map<string, { total: number; newCount: number }>();
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
    if (!checked.ok) redirect("/admin/login");
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
    const topicDocs = await DemoRequestModel.aggregate<{ _id: string; total: number; newCount: number }>([
      {
        $group: {
          _id: "$interest",
          total: { $sum: 1 },
          newCount: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
        },
      },
    ]);
    topicCounts = new Map(topicDocs.map((t) => [t._id, { total: t.total, newCount: t.newCount }]));
    workshops = await listWorkshops();
  } catch {
    redirect("/admin/login");
  }
  const newRequests = requests.filter((r) => r.status === "new").length;
  const activeAdmins = allAdmins.filter((a) => a.status === "active").length;
  const upcomingWorkshops = workshops.filter((w) => isWorkshopUpcoming(w.date));
  const upcoming = upcomingWorkshops.length;
  // Fixed topics + upcoming workshops + anything already enquired about, e.g. a workshop that has since finished.
  const topics = [...new Set<string>([...interests, ...upcomingWorkshops.map((w) => workshopInterest(w.title)), ...topicCounts.keys()])];

  const sections: AdminSection[] = [
    {
      id: "overview",
      label: "Overview",
      icon: "dashboard",
      content: (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Overview">
          <StatCard
            label="New enquiries"
            value={String(newRequests)}
            hint={`${requests.length} total received`}
            href="#enquiries"
            icon="mail"
            accent="orange"
          />
          <StatCard
            label="Workshops"
            value={String(workshops.length)}
            hint={`${upcoming} upcoming`}
            href="#workshops"
            icon="calendar"
            accent="royal"
          />
          <StatCard
            label="Administrators"
            value={String(allAdmins.length)}
            hint={`${activeAdmins} active`}
            href="#administrators"
            icon="users"
            accent="green"
          />
        </section>
      ),
    },
    {
      id: "forms",
      label: "Forms",
      icon: "pencil",
      content: (
        <Card title="Contact and demo form" subtitle="Submissions by the “I'm interested in” topic.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead className="bg-canvas">
                <tr className="border-b border-line text-[11px] font-bold tracking-[1.2px] text-muted uppercase">
                  <th className="px-6 py-3.5">Topic</th>
                  <th className="px-6 py-3.5">Total</th>
                  <th className="px-6 py-3.5">New</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topics.map((topic) => {
                  const count = topicCounts.get(topic) ?? { total: 0, newCount: 0 };
                  return (
                    <tr key={topic} className="transition-colors hover:bg-canvas/60">
                      <td className="px-6 py-3.5 text-navy">{topic}</td>
                      <td className="px-6 py-3.5 text-muted">{count.total}</td>
                      <td className="px-6 py-3.5 font-semibold text-navy">{count.newCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ),
    },
    {
      id: "enquiries",
      label: "Enquiries",
      icon: "mail",
      content: (
        <Card title="Demo and contact requests" subtitle="Newest first. Visible only to admins.">
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No enquiries yet. New Book-a-Demo and contact submissions will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="bg-canvas">
                  <tr className="border-b border-line text-[11px] font-bold tracking-[1.2px] text-muted uppercase">
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Organization</th>
                    <th className="px-6 py-3.5">Interest</th>
                    <th className="px-6 py-3.5">Message</th>
                    <th className="px-6 py-3.5">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {requests.map((r, i) => (
                    <tr key={`${r.email}-${r.createdAt?.toISOString() ?? i}`} className="transition-colors hover:bg-canvas/60">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {r.status === "new" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-2.5 py-1 text-[12px] font-semibold text-orange-dark">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-orange" />
                New
              </span>
                        ) : (
                          <span className="text-muted">{r.status}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-navy break-all">{r.name}</td>
                      <td className="px-6 py-3.5 text-muted break-all">{r.email}</td>
                      <td className="px-6 py-3.5 text-muted break-all">{r.organization}</td>
                      <td className="px-6 py-3.5 text-muted break-all">{r.interest}</td>
                      <td className="max-w-[320px] px-6 py-3.5 text-muted wrap-break-word">{r.message}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-muted">{fmt(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ),
    },
    {
      id: "workshops",
      label: "Workshops",
      icon: "calendar",
      content: (
        <Card title="Published workshops">
          <WorkshopList workshops={workshops} />
        </Card>
      ),
    },
    {
      id: "administrators",
      label: "Administrators",
      icon: "users",
      content: (
        <Card title="Administrators" subtitle="Accounts and recent logins.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="bg-canvas">
                <tr className="border-b border-line text-[11px] font-bold tracking-[1.2px] text-muted uppercase">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last login</th>
                  <th className="px-6 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {allAdmins.map((a) => (
                  <tr key={a.email} className="transition-colors hover:bg-canvas/60">
                    <td className="px-6 py-3.5 text-navy break-all">{a.name}</td>
                    <td className="px-6 py-3.5 text-navy break-all">{a.email}</td>
                    <td className="px-6 py-3.5 text-muted">{a.role}</td>
                    <td className="px-6 py-3.5 text-muted">{a.status}</td>
                    <td className="px-6 py-3.5 text-muted">{fmt(a.lastLoginAt)}</td>
                    <td className="px-6 py-3.5 text-muted">{fmt(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <AdminDashboardShell
      header={
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] leading-none font-bold tracking-[-0.3px] text-navy md:text-[28px]">Dashboard</h1>
            {!verifiedAt && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#fff6e0] px-3 py-1 text-[12px] font-semibold text-[#8a5a00]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
                Email not verified — verify it to keep this account secure.
              </p>
            )}
          </div>
          <AdminLogoutButton />
        </header>
      }
      sections={sections}
      footer={<p className="text-[12px] text-muted">Sessions expire automatically. Log out when finished.</p>}
    />
  );
}
