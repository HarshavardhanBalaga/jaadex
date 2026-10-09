import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ContactPageClient } from "@/components/ContactPageClient";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";

export const metadata: Metadata = { title: "Contact", description: "Contact JaaDeX about school packages, animation learning, AI filmmaking and partnerships." };

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mt-[13px] flex items-start gap-[15px] rounded-[18px] bg-[#eef3ff] p-[17px] text-royal">
      <span className="shrink-0">{icon}</span>
      <div>
        <h3 className="mb-[5px] text-[15px] font-bold">{title}</h3>
        <p className="text-xs leading-[1.6] text-muted">{children}</p>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Start a conversation" title={<>Let&apos;s make room for <span>your ideas.</span></>} description="Interested in JaaDeX Animate, school packages, AI filmmaking learning or collaboration? Share a few details and tell us what you want to explore." art="💌" />
      <Section>
        <Container className="grid items-start gap-[25px] md:grid-cols-[.85fr_1.15fr] md:gap-12">
          <div>
            <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Contact JaaDeX</div>
            <h2 className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">Tell us what you&apos;re imagining.</h2>
            <p className="mb-[22px] text-[15px] leading-[1.75] text-muted">Use the form to describe your enquiry. Before launch, connect this form to your official company email, CRM or backend so enquiries are received securely.</p>
            <InfoCard icon={<Icon name="school" size={25} />} title="Schools & institutions">Ask about animation learning, school implementation and teacher support.</InfoCard>
            <InfoCard icon={<Icon name="clapperboard" size={25} />} title="Creative courses">Ask about AI filmmaking, storytelling and animation learning opportunities.</InfoCard>
            <InfoCard icon={<Icon name="mail" size={25} />} title="Email contact">Current placeholder: hello@jaadex.com. Confirm the official address before publishing.</InfoCard>
          </div>
          <div className="rounded-[25px] border border-line bg-white p-[21px] shadow-[0_12px_30px_rgb(20_60_160/0.03)] md:p-[27px]">
            <h3 className="mb-[7px] font-display text-[22px] font-bold text-navy">Enquiry form</h3>
            <p className="mb-5 text-[13px] text-muted">Fields marked required must be completed.</p>
            <ContactPageClient />
          </div>
        </Container>
      </Section>
    </>
  );
}
