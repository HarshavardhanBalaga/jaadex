import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { UserRegisterForm } from "@/components/auth/UserRegisterForm";
import { getCurrentUser } from "@/lib/user/session";
import { safeNext } from "@/lib/user/safe-next";

export const metadata: Metadata = { title: "Create account", description: "Create your JaaDeX account." };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next: rawNext, reason } = await searchParams;
  const next = safeNext(rawNext);
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return (
    <>
      <PageHero
        eyebrow="Join JaaDeX"
        title={<>Create your <span>account.</span></>}
        description="We'll email you a code to verify your address. It only takes a minute."
        art="✨"
      />
      <Section>
        <Container className="max-w-[560px]">
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
            <h2 className="mb-[7px] font-display text-[22px] font-bold text-navy">Register</h2>
            <p className="mb-5 text-[13px] text-muted">All fields are required.</p>
            {reason === "no_account" ? (
              <p role="status" className="mb-5 rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">
                We couldn&apos;t find an account for that email. Create one below to continue.
              </p>
            ) : null}
            <UserRegisterForm next={next} />
          </div>
        </Container>
      </Section>
    </>
  );
}
