import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { AdminModel } from "@/models/Admin";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

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

/** Server-protected: proxy redirect is UX only; this check is the boundary. */
export default async function AdminDashboardPage() {
  let email = "";
  let role = "";
  let status = "";
  let createdAt: Date | null = null;
  let lastLoginAt: Date | null = null;
  let verifiedAt: Date | null = null;
  // Allowlisted login tracking: who holds an account + when each last logged in.
  let allAdmins: Array<{ email: string; role: string; status: string; lastLoginAt: Date | null; createdAt: Date | null }> = [];
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
    if (!checked.ok) redirect("/admin/login");
    email = checked.ctx.admin.email;
    role = checked.ctx.admin.role;
    status = checked.ctx.admin.status;
    createdAt = checked.ctx.admin.createdAt ? new Date(checked.ctx.admin.createdAt) : null;
    lastLoginAt = checked.ctx.admin.lastLoginAt ? new Date(checked.ctx.admin.lastLoginAt) : null;
    verifiedAt = checked.ctx.admin.emailVerifiedAt ? new Date(checked.ctx.admin.emailVerifiedAt) : null;
    const docs = await AdminModel.find({})
      .select({ email: 1, role: 1, status: 1, lastLoginAt: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();
    allAdmins = docs.map((d) => ({
      email: d.email,
      role: d.role,
      status: d.status,
      lastLoginAt: d.lastLoginAt ? new Date(d.lastLoginAt) : null,
      createdAt: d.createdAt ? new Date(d.createdAt) : null,
    }));
  } catch {
    redirect("/admin/login");
  }
  const rows: Array<[string, string]> = [
    ["Email", email],
    ["Role", role],
    ["Account status", status],
    ["Email verified", verifiedAt ? fmt(verifiedAt) : "—"],
    ["Registered", fmt(createdAt)],
    ["Last login", fmt(lastLoginAt)],
  ];
  return (
    <Section>
      <Container className="max-w-[820px]">
        <SectionHeading
          eyebrow="Admin dashboard"
          title="Administrator profile"
          description="Account details for the signed-in administrator."
          align="left"
        />
        <div className="overflow-hidden rounded-[25px] border border-line bg-white shadow-[0_12px_30px_rgb(20_60_160/0.06)]">
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-5 py-4 max-sm:grid-cols-1 max-sm:gap-1">
                <dt className="text-xs font-black tracking-[1px] text-muted uppercase">{k}</dt>
                <dd className="text-[15px] font-bold text-navy break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-5 py-4">
            <p className="text-[12px] text-muted">Sessions expire automatically. Log out when finished.</p>
            <AdminLogoutButton />
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-[25px] border border-line bg-white shadow-[0_12px_30px_rgb(20_60_160/0.06)]">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-display text-[17px] font-bold text-navy">All administrators</h3>
            <p className="mt-0.5 text-[12px] text-muted">Every account plus its most recent login.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-black tracking-[1px] text-muted uppercase">
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
                    <td className="px-5 py-3 font-bold text-navy break-all">{a.email}</td>
                    <td className="px-5 py-3 text-muted">{a.role}</td>
                    <td className="px-5 py-3 text-muted">{a.status}</td>
                    <td className="px-5 py-3 text-muted">{fmt(a.lastLoginAt)}</td>
                    <td className="px-5 py-3 text-muted">{fmt(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </Section>
  );
}
