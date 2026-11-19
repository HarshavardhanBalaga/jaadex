import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { getCurrentUser } from "@/lib/user/session";

export const metadata: Metadata = { title: "Profile", description: "Your JaaDeX account." };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=%2Fprofile");
  return (
    <Section>
      <Container className="max-w-[448px]">
        <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
          <h2 className="mb-5 text-center font-display text-[22px] font-bold text-navy">Profile</h2>
          <dl className="space-y-4 text-[15px]">
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Name</dt>
              <dd className="font-semibold text-navy">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Email</dt>
              <dd className="break-all font-semibold text-navy">{user.email || "—"}</dd>
            </div>
          </dl>
        </div>
      </Container>
    </Section>
  );
}
