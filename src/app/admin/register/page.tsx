import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { AdminRegisterForm } from "@/components/admin/AdminRegisterForm";

export const metadata: Metadata = { title: "Admin Registration", description: "First-time JaaDeX admin setup." };

export default function AdminRegisterPage() {
  return (
    <>
      <PageHero
        eyebrow="First-time setup"
        title={<>Create the <span>admin account.</span></>}
        description="A verification code is sent to the administrator inbox to activate each new account."
        art="🛡️"
      />
      <Section>
        <Container className="max-w-[560px]">
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
            <h2 className="mb-[7px] font-display text-[22px] font-bold text-navy">Admin registration</h2>
            <p className="mb-5 text-[13px] text-muted">Use the administrator email. Verification is mandatory.</p>
            <AdminRegisterForm />
          </div>
        </Container>
      </Section>
    </>
  );
}
