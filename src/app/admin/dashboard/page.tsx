import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminFromToken } from "@/lib/admin/auth";
import { getAdminAuthConfig } from "@/lib/admin/auth-config";
import { AdminModel } from "@/models/Admin";
import { DemoRequestModel } from "@/models/DemoRequest";
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
  let name = "";
  let email = "";
  let role = "";
  let status = "";
  let createdAt: Date | null = null;
  let lastLoginAt: Date | null = null;
  let verifiedAt: Date | null = null;
  // Allowlisted login tracking: who holds an account + when each last logged in.
  let allAdmins: Array<{ name: string; email: string; role: string; status: string; lastLoginAt: Date | null; createdAt: Date | null }> = [];
  // Demo & contact enquiries: newest first. Admin eyes only — this page is server-guarded.
  let requests: Array<{ name: string; email: string; organization: string; interest: string; message: string; status: string; createdAt: Date | null }> = [];
  try {
    const c = getAdminAuthConfig();
    const store = await cookies();
    const checked = await requireAdminFromToken(store.get(c.accessCookieName)?.value ?? null);
    if (!checked.ok) redirect("/admin/login");
    name = checked.ctx.admin.name ?? "";
    email = checked.ctx.admin.email;
    role = checked.ctx.admin.role;
    status = checked.ctx.admin.status;
    createdAt = checked.ctx.admin.createdAt ? new Date(checked.ctx.admin.createdAt) : null;
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
  } catch {
    redirect("/admin/login");
  }
  const rows: Array<[string, string]> = [
    ["Name", name || "—"],
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
            <div className="flex flex-wrap items-center gap-3">
              <a href="/admin/survey-playground" className="text-[13px] font-black text-royal hover:underline">
                SurveyJS Playground →
              </a>
              <AdminLogoutButton />
            </div>
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
                    <td className="px-5 py-3 font-bold text-navy break-all">{a.name}</td>
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
        <div className="mt-6 overflow-hidden rounded-[25px] border border-line bg-white shadow-[0_12px_30px_rgb(20_60_160/0.06)]">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-display text-[17px] font-bold text-navy">Demo &amp; contact requests</h3>
            <p className="mt-0.5 text-[12px] text-muted">Every Book-a-Demo and Contact-us enquiry, newest first. Visible only to admins.</p>
          </div>
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">No enquiries yet. New Book-a-Demo and contact submissions will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-black tracking-[1px] text-muted uppercase">
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
                      <td className="px-5 py-3 font-bold text-navy break-all">{r.name}</td>
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
        </div>
      </Container>
    </Section>
  );
}
