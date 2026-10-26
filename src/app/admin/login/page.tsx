import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isGoogleOAuthEnabled } from "@/lib/oauth/google-config";

export const metadata: Metadata = { title: "Admin Login", description: "JaaDeX admin sign in." };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  // Only a fixed flag is read from the query; it never carries credentials.
  const { error } = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Admin access"
        title={<>Welcome back, <span>admin.</span></>}
        description="Sign in with your administrator account to open the dashboard."
        art="🔐"
      />
      <Section>
        <Container className="max-w-[560px]">
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
            <h2 className="mb-[7px] font-display text-[22px] font-bold text-navy">Admin login</h2>
            <p className="mb-5 text-[13px] text-muted">Use the administrator email and password.</p>
            <AdminLoginForm googleEnabled={isGoogleOAuthEnabled()} googleError={error === "google"} />
          </div>
        </Container>
      </Section>
    </>
  );
}
