import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { KidsChallengeRegisterForm } from "@/components/kids/KidsChallengeRegisterForm";
import { RazorpayPayButton } from "@/components/kids/RazorpayPayButton";
import { RegistrationNotice } from "@/components/workshops/RegistrationNotice";
import { benefits, eligibility, hero } from "@/data/kids-challenge";
import { Icon } from "@/components/Icon";
import { pendingKidsChallengeRegistration, userKidsChallengeRegistrations } from "@/lib/kids-challenge/registration-service";
import { getCurrentUser } from "@/lib/user/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register – Kids Creative Challenge",
  description: "Register a student for the JaaDeX Kids Creative Challenge.",
};

const REGISTER_PATH = "/kids-creative-challenge/register";
const LOGIN_URL = `/login?next=${encodeURIComponent(REGISTER_PATH)}`;

export default async function KidsChallengeRegisterPage({ searchParams }: PageProps<"/kids-creative-challenge/register">) {
  const { edit } = await searchParams;
  const user = await getCurrentUser().catch(() => null);
  // DB hiccup → no lists; the API still refuses a duplicate on submit.
  const empty = { paid: [] as string[], pending: [] as { id: string; studentName: string }[] };
  const { paid, pending } = user ? await userKidsChallengeRegistrations(user).catch(() => empty) : empty;
  // "Edit" on an unpaid registration opens the form with its saved values.
  const editing = user && typeof edit === "string" ? await pendingKidsChallengeRegistration(user, edit).catch(() => null) : null;

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
            {paid.length > 0 ? (
              <RegistrationNotice tone="success" title="Confirmed registrations">
                {paid.join(", ")}. You can register another child below.
              </RegistrationNotice>
            ) : null}

            {pending.length > 0 && !editing ? (
              <div className="grid gap-3 rounded-[13px] border border-[#f4d2b8] bg-[#fff6ee] p-[15px]">
                <p className="font-display text-[16px] font-bold text-navy">Awaiting payment</p>
                <p className="text-[14px] leading-[1.6] text-muted">These registrations are saved but not confirmed until the ₹99 fee is paid.</p>
                <ul className="grid gap-3">
                  {pending.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f4d2b8] pt-3">
                      <span className="font-bold text-navy">{r.studentName}</span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${REGISTER_PATH}?edit=${r.id}`}
                          aria-label={`Edit details for ${r.studentName}`}
                          title="Edit details"
                          className="grid size-9 place-items-center rounded-full border border-royal/30 bg-white text-royal hover:text-orange"
                        >
                          <Icon name="pencil" size={16} />
                        </Link>
                        <RazorpayPayButton registrationId={r.id} label={`Pay ₹99 for ${r.studentName}`} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {user && editing ? (
              <div className="grid gap-5">
                <Link href={REGISTER_PATH} className="justify-self-start text-[14px] font-black text-royal hover:text-orange">
                  <span aria-hidden="true">←</span> Back to saved registrations
                </Link>
                <KidsChallengeRegisterForm
                  user={{ name: user.name, email: user.email }}
                  initial={{ registrationId: editing.id, values: editing }}
                />
              </div>
            ) : user ? (
              // Unpaid registrations are shown above with their Pay button; the form only appears when there are none.
              pending.length === 0 ? <KidsChallengeRegisterForm user={{ name: user.name, email: user.email }} /> : null
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
