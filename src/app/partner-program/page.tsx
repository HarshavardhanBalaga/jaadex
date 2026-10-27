import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Partner Program",
  description: "Partner with JaaDeX to make learning more engaging through animation, storytelling and creative technology.",
};

const partnerHref = "/contact";

const partners = [
  { icon: "school", label: "Schools" },
  { icon: "book", label: "Educators" },
  { icon: "palette", label: "Creators" },
  { icon: "handshake", label: "Organizations" },
] as const;

export default function PartnerProgramPage() {
  return (
    <>
      <PageHero
        eyebrow="Partner with JaaDeX"
        title={<>Let’s create something <span>meaningful together.</span></>}
        description="We’re looking for schools, educators, creators and organizations who want to explore new ways of making learning more engaging through animation, storytelling and creative technology."
        image={{ src: "/assets/workshop-collab.jpg", alt: "Three people collaborating on laptops at a table" }}
      >
        <ButtonLink href={partnerHref}>Become a Partner</ButtonLink>
      </PageHero>

      <Section>
        <Container>
          <SectionHeading eyebrow="Who can partner?" title="Schools, educators, creators and organizations." />
          <div className="flex flex-wrap justify-center gap-3">
            {partners.map((partner) => (
              <span
                key={partner.label}
                className="inline-flex items-center gap-2.5 rounded-full border border-line bg-paper px-5 py-3 text-[15px] font-black text-navy shadow-[0_8px_22px_rgb(20_60_160/0.04)]"
              >
                <span className="grid size-8 place-items-center rounded-full bg-[#dce8ff] text-royal" aria-hidden="true">
                  <Icon name={partner.icon} size={17} />
                </span>
                {partner.label}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Have an idea?" description="Tell us what you have in mind and let’s explore what we can build together.">
            <ButtonLink href={partnerHref}>Get in Touch →</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
    </>
  );
}
