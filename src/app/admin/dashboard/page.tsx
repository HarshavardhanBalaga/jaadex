import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { AdminModel } from "@/models/Admin";
import { DemoRequestModel } from "@/models/DemoRequest";
import { WorkshopModel } from "@/models/Workshop";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { Icon } from "@/components/Icon";
import { AdminDashboardShell, type AdminSection } from "@/components/admin/AdminDashboardShell";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { WorkshopList, type WorkshopListItem } from "@/components/admin/WorkshopList";
import { interests } from "@/lib/contact/validation";

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
  royal: { chip: "bg-[#e9efff] text-royal" },
  orange: { chip: "bg-[#fff0e6] text-orange-dark" },
  green: { chip: "bg-[#e8f6e8] text-green" },
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
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[12px] font-semibold text-navy">{label}</p>
        <p className="mt-1 font-display text-[28px] leading-none font-bold text-navy">{value}</p>
        <p className="mt-1.5 text-[12px] text-ink">{hint}</p>
      </div>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.chip}`}>
        <Icon name={icon} size={20} />
      </span>
    </div>
  );
  const frame = "rounded-2xl border border-line bg-white p-5 shadow-soft";
  return href ? (
    <a href={href} className={`${frame} block transition-colors hover:border-royal/50`}>
      {body}
    </a>
  ) : (
    <div className={frame}>{body}</div>
  );
}

function Card({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f5f8ff] px-5 py-4">
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
  // Submission counts per form topic, across all requests (not just the newest 50).
  let topicCounts = new Map<string, { total: number; newCount: number }>();
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

  const sections: AdminSection[] = [
    {
      id: "overview",
      label: "Overview",
      icon: "dashboard",
      content: (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Overview">
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
              <thead className="bg-[#f5f8ff]">
                <tr className="border-b border-line text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">
                  <th className="px-5 py-3">Topic</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">New</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {interests.map((topic) => {
                  const count = topicCounts.get(topic) ?? { total: 0, newCount: 0 };
                  return (
                    <tr key={topic}>
                      <td className="px-5 py-3 text-navy">{topic}</td>
                      <td className="px-5 py-3 text-muted">{count.total}</td>
                      <td className="px-5 py-3 font-semibold text-navy">{count.newCount}</td>
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
                <thead className="bg-[#f5f8ff]">
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
                          <span className="rounded-full bg-[#fff0e6] px-2.5 py-0.5 text-[12px] font-semibold text-orange-dark">New</span>
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
      ),
    },
    {
      id: "workshops",
      label: "Workshops",
      icon: "calendar",
      content: (
        <div className="grid gap-6">
          <Card title="Publish a workshop" subtitle="Appears on the Workshops page after publishing.">
            <div className="p-5">
              <WorkshopForm />
            </div>
          </Card>
          <Card title="Published workshops" subtitle="Currently on the calendar.">
            <WorkshopList workshops={workshops} />
          </Card>
        </div>
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
              <thead className="bg-[#f5f8ff]">
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
        </Card>
      ),
    },
  ];

  return (
    <AdminDashboardShell
      header={
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
      }
      sections={sections}
      footer={<p className="text-[12px] text-muted">Sessions expire automatically. Log out when finished.</p>}
    />
  );
}
