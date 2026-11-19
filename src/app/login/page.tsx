import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { UserLoginForm } from "@/components/auth/UserLoginForm";
import { getCurrentUser } from "@/lib/user/session";
import { safeNext } from "@/lib/user/safe-next";

export const metadata: Metadata = { title: "Log in", description: "Log in to your JaaDeX account." };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return (
    <>
      <Section>
        <Container className="max-w-[448px]">
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.06)] md:p-[27px]">
            <h1 className="mb-[7px] text-center font-display text-[22px] font-bold text-navy">Welcome back</h1>
            <p className="mb-5 text-center text-[13px] text-muted">Log in to your account to continue.</p>
            <UserLoginForm next={next} googleError={params.error === "google"} />
          </div>
        </Container>
      </Section>
    </>
  );
}
