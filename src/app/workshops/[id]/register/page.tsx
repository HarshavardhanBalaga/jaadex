import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { RegistrationNotice } from "@/components/workshops/RegistrationNotice";
import { WorkshopRegisterForm } from "@/components/workshops/WorkshopRegisterForm";
import { formatWorkshopDate, isWorkshopUpcoming } from "@/lib/workshops/format";
import { getWorkshopById } from "@/lib/workshops/queries";
import { registeredWorkshopIds } from "@/lib/workshops/registration-service";
import { getCurrentUser } from "@/lib/user/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Register for a workshop", description: "Register for a JaaDeX workshop." };

/* eslint-disable @next/next/no-img-element */
export default async function WorkshopRegisterPage({ params }: PageProps<"/workshops/[id]/register">) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const workshop = await getWorkshopById(id);
  if (!workshop) notFound();

  const user = await getCurrentUser().catch(() => null);
  // DB hiccup → no "already registered" state; the API still refuses a duplicate on submit.
  const alreadyRegistered = user ? (await registeredWorkshopIds(user).catch(() => new Set<string>())).has(id) : false;

  const { registration } = workshop;
  const completed = !isWorkshopUpcoming(workshop.date);
  const registrationOpen = !completed && registration.enabled;
  const full = registration.capacity !== null && registration.count >= registration.capacity;
  const loginUrl = `/login?next=${encodeURIComponent(`/workshops/${id}/register`)}`;

  return (
    <>
      {/* Full-screen image. Plain img: the stored image is a data URL. */}
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-navy">
        <img src={workshop.image} alt={workshop.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/50 via-transparent to-transparent" aria-hidden="true" />
        <Container className="relative pt-6">
          <Link href="/workshops" className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-[13px] font-black text-royal hover:text-orange">
            <span aria-hidden="true">←</span> All workshops
          </Link>
        </Container>
      </section>

      {/* Title and description rectangle: its top edge sits at 50% of the screen height, overlapping the image. */}
      <Section className="relative -mt-[50svh] pt-0 pb-0">
        <Container className="max-w-[820px]">

          <div className="rounded-[25px] border border-line bg-white p-6 shadow-[0_12px_30px_rgb(20_60_160/0.08)] md:p-10">
            <h1 className="font-display text-[clamp(28px,4vw,44px)] leading-[1.08] font-black tracking-[-1.5px] text-royal-dark">{workshop.title}</h1>
            <p className="mt-4 text-[15px] leading-[1.75] whitespace-pre-line text-muted">{workshop.description}</p>

            {/* Date, time, location, separated from the text and from each other by lines. */}
            <dl className="mt-7 grid grid-cols-1 divide-y divide-line border-t border-line pt-2 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="py-4 md:px-5 md:first:pl-0 md:last:pr-0">
                <dt className="text-[11px] font-black tracking-[1.2px] text-orange uppercase">Date</dt>
                <dd className="mt-1 text-[15px] font-bold text-navy">{workshop.date ? formatWorkshopDate(workshop.date) : "To be announced"}</dd>
              </div>
              <div className="py-4 md:px-5 md:first:pl-0 md:last:pr-0">
                <dt className="text-[11px] font-black tracking-[1.2px] text-orange uppercase">Time</dt>
                <dd className="mt-1 text-[15px] font-bold text-navy">{workshop.time || "To be announced"}</dd>
              </div>
              <div className="py-4 md:px-5 md:first:pl-0 md:last:pr-0">
                <dt className="text-[11px] font-black tracking-[1.2px] text-orange uppercase">Location</dt>
                <dd className="mt-1 text-[15px] font-bold text-navy">{workshop.location || "To be announced"}</dd>
              </div>
            </dl>
          </div>
        </Container>
      </Section>

      {/* Registration module: starts right below the title and description card. */}
      <Section className="pt-8 md:pt-10">
        <Container className="max-w-[820px]">
          {/* Registration: below the workshop details. */}
          <div className="rounded-[25px] border border-line bg-white p-6 md:p-10">
            <h2 className="mb-5 font-display text-[22px] font-bold text-navy">Register for this workshop</h2>
            {alreadyRegistered ? (
              <RegistrationNotice title="You're already registered">
                You already have a seat for this workshop. We&apos;ll contact you at the email or phone number you registered with.
              </RegistrationNotice>
            ) : completed ? (
              <RegistrationNotice title="This workshop has already taken place">Browse our other workshops to see what is coming up next.</RegistrationNotice>
            ) : !registrationOpen ? (
              <RegistrationNotice title="Registration is not open yet">
                Registration for this workshop is currently closed. Use “Ask about this workshop” and we’ll let you know when seats open.
              </RegistrationNotice>
            ) : full ? (
              <RegistrationNotice title="Registrations closed">
                All seats for this workshop have been filled. Thank you for your interest! Use “Ask about this workshop” and we’ll let you know about the
                next session.
              </RegistrationNotice>
            ) : user ? (
              <WorkshopRegisterForm workshopId={id} user={{ name: user.name, email: user.email }} />
            ) : (
              <div className="grid justify-items-start gap-4">
                <p className="text-[14px] leading-[1.6] text-muted">Log in to your JaaDeX account to reserve your seat.</p>
                <Link
                  href={loginUrl}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-6 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  Log in to register ↗
                </Link>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
/* eslint-enable @next/next/no-img-element */
