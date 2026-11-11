import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/Container";
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
      <Section>
        <Container className="max-w-[448px]">
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
            <h2 className="mb-[7px] font-display text-[22px] font-bold text-navy">Register</h2>
            <p className="mb-5 text-[13px] text-muted">All fields are required.</p>
            <UserRegisterForm next={next} noAccount={reason === "no_account"} />
          </div>
        </Container>
      </Section>
    </>
  );
}
