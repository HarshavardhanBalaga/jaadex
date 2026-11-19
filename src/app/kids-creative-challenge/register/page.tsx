import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { KidsChallengeRegisterForm } from "@/components/kids/KidsChallengeRegisterForm";
import { RegistrationNotice } from "@/components/workshops/RegistrationNotice";
import { benefits, eligibility, hero } from "@/data/kids-challenge";
import { registeredStudentNames } from "@/lib/kids-challenge/registration-service";
import { getCurrentUser } from "@/lib/user/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register – Kids Creative Challenge",
  description: "Register a student for the JaaDeX Kids Creative Challenge.",
};

const LOGIN_URL = `/login?next=${encodeURIComponent("/kids-creative-challenge/register")}`;

export default async function KidsChallengeRegisterPage() {
  const user = await getCurrentUser().catch(() => null);
  // DB hiccup → no list; the API still refuses a duplicate on submit.
  const registered = user ? await registeredStudentNames(user).catch(() => []) : [];

  return (
    <Section className="bg-hero-wash">
      <Container className="max-w-[820px]">
        <Link href="/kids-creative-challenge" className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-[13px] font-black text-royal hover:text-orange">
          <span aria-hidden="true">←</span> Back to the challenge
        </Link>

        <div className="mt-6 rounded-[25px] border border-line bg-white p-6 shadow-[0_12px_30px_rgb(20_60_160/0.08)] md:p-10">
          <p className="text-[11px] font-black tracking-[1.2px] text-orange uppercase">{hero.eyebrow}</p>
          <h1 className="mt-3 font-display text-[clamp(28px,4vw,44px)] leading-[1.08] font-black tracking-[-1.5px] text-royal-dark">
            Register for the {hero.heading}
          </h1>
          <p className="mt-4 text-[15px] leading-[1.75] text-muted">
            Entry fee: <strong className="text-navy">{benefits.price} per student</strong>. {eligibility.disclaimer}
          </p>

          <div className="mt-8 grid gap-6">
            {registered.length > 0 ? (
              <RegistrationNotice tone="success" title="Already registered from this account">
                {registered.join(", ")}. You can register another child below.
              </RegistrationNotice>
            ) : null}

            {user ? (
              <KidsChallengeRegisterForm user={{ name: user.name, email: user.email }} />
            ) : (
              <div className="grid justify-items-start gap-4">
                <p className="text-[14px] leading-[1.6] text-muted">Log in to your JaaDeX account to register a student.</p>
                <Link
                  href={LOGIN_URL}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-6 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  Log in to register ↗
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
