import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ContactPageClient } from "@/components/ContactPageClient";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { business } from "@/lib/business";
import { getCurrentUser } from "@/lib/user/session";
import { listUpcomingWorkshopInterests } from "@/lib/workshops/queries";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact JaaDeX Innovision for school programmes, creative workshops, support, refunds and grievances.",
};

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mt-[13px] flex items-start gap-[15px] rounded-[18px] bg-[#eef3ff] p-[17px] text-royal">
      <span className="shrink-0">{icon}</span>
      <div>
        <h3 className="mb-[5px] text-[15px] font-bold">{title}</h3>
        <div className="text-xs leading-[1.6] text-muted">{children}</div>
      </div>
    </div>
  );
}

const linkClass = "font-bold text-royal underline-offset-4 hover:underline";

/** Public page. Only the enquiry form needs a website account; the form itself checks the session again on submit. */
export default async function ContactPage() {
  const user = await getCurrentUser().catch(() => null);
  // Database trouble only hides the workshop topics; the rest of the form still works.
  const workshopInterests = user ? await listUpcomingWorkshopInterests().catch(() => []) : [];
  return (
    <>
      <Section>
        <Container className="grid items-start gap-[25px] md:grid-cols-[.85fr_1.15fr] md:gap-12">
          <div>
            <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Contact JaaDeX</div>
            <h1 className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">Get in touch with the JaaDeX team.</h1>
            <p className="mb-[22px] text-[15px] leading-[1.75] text-muted">
              Reach us by email or phone for school programmes, workshops, account or payment questions. You can also send an enquiry through the form.
            </p>

            <InfoCard icon={<Icon name="layers" size={25} />} title="Business name">
              {business.legalName}
            </InfoCard>
            <InfoCard icon={<Icon name="mail" size={25} />} title="Email">
              <a href={`mailto:${business.email}`} className={linkClass}>
                {business.email}
              </a>
            </InfoCard>
            <InfoCard icon={<Icon name="users" size={25} />} title="Phone / WhatsApp">
              <a href={business.phoneHref} className={linkClass}>
                {business.phoneDisplay}
              </a>
            </InfoCard>
            <InfoCard icon={<Icon name="school" size={25} />} title="Office address">
              {business.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </InfoCard>
            <InfoCard icon={<Icon name="laptop" size={25} />} title="Website">
              <a href={business.website} className={linkClass}>
                {business.website.replace("https://", "")}
              </a>
            </InfoCard>
          </div>

          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.03)] md:p-[27px]">
            <h2 className="mb-[7px] font-display text-[22px] font-bold text-navy">Send an enquiry</h2>
            {user ? (
              <>
                <p className="mb-5 text-[13px] text-muted">Fields marked required must be completed.</p>
                <ContactPageClient workshopInterests={workshopInterests} />
              </>
            ) : (
              <>
                <p className="mb-5 text-[13px] leading-[1.7] text-muted">
                  Enquiries are sent from a JaaDeX account, so you can follow up on your request. Log in or create an account to use the form, or email us at{" "}
                  <a href={`mailto:${business.email}`} className={linkClass}>
                    {business.email}
                  </a>{" "}
                  directly.
                </p>
                <Link
                  href="/login?next=%2Fcontact"
                  className="inline-flex rounded-xl bg-royal px-5 py-[10px] text-[15px] font-bold text-white shadow-pop-royal hover:opacity-90"
                >
                  Log in to send an enquiry
                </Link>
              </>
            )}
          </div>
        </Container>
      </Section>

      <Section className="bg-[#f6f8ff]">
        <Container className="max-w-[820px]">
          <h2 className="mb-4 font-display text-[clamp(26px,3.4vw,34px)] leading-[1.15] font-black tracking-[-1px] text-navy">Grievances and escalation</h2>
          <p className="mb-5 text-[15px] leading-[1.75] text-muted">
            If you have a complaint about a registration, payment, refund, delivery of access or any other service matter, please follow these steps.
          </p>
          <ol className="grid list-decimal gap-3 pl-5 text-[15px] leading-[1.75] text-muted marker:font-bold marker:text-royal">
            <li>
              Email <a href={`mailto:${business.email}`} className={linkClass}>{business.email}</a> with the subject line &ldquo;Grievance&rdquo;. Include your name, the email address on your account, the workshop or service concerned and, for payments, the transaction or order reference.
            </li>
            <li>
              We will acknowledge your grievance in writing and review the details with the relevant team. We may ask for more information to resolve it.
            </li>
            <li>
              If you do not hear back, or you are not satisfied with the outcome, write to us at our office address above, marked &ldquo;Attention: Grievance&rdquo;, quoting your original email.
            </li>
          </ol>
          <p className="mt-5 text-[13px] leading-[1.7] text-muted">
            For how we handle personal information and privacy requests, see the <Link href="/privacy-policy" className={linkClass}>Privacy Policy</Link>. For refunds and cancellations, see the <Link href="/refund-policy" className={linkClass}>Refund &amp; Cancellation Policy</Link>.
          </p>
        </Container>
      </Section>
    </>
  );
}
