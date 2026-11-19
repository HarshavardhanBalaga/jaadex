import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { Container } from "@/components/Container";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Pricing",
  description: "JaaDeX offerings for schools, students and teachers: what each includes, who it is for, how it is delivered and how pricing is confirmed.",
};

type Offering = {
  name: string;
  icon: ComponentProps<typeof Icon>["name"];
  description: string;
  receives: string[];
  eligibility: string;
  delivery: string;
  limitations: string;
};

const offerings: Offering[] = [
  {
    name: "JaaDeX for Schools",
    icon: "school",
    description:
      "A structured creative-learning programme that brings animation, storytelling and digital creation into the classroom, set up with the school.",
    receives: [
      "JaaDeX Animate software",
      "Creative learning curriculum",
      "Animation and storytelling activities",
      "Teacher training",
      "Student projects and digital creation tools",
      "Implementation and technical support",
    ],
    eligibility: "Schools and institutions. The scope is agreed after an onboarding discussion about the school’s requirements and infrastructure.",
    delivery: "Onboarding, then teacher training, then student learning, project creation and a showcase, scheduled with the school.",
    limitations: "Scope, duration and student numbers depend on the agreed plan, which is confirmed in writing.",
  },
  {
    name: "Student workshops",
    icon: "clapperboard",
    description:
      "Hands-on workshops in animation & storytelling, AI filmmaking and creative technology, where students turn an idea into a visual story or a digital creation.",
    receives: [
      "Guided sessions covering story ideas, characters, storyboarding and scene design",
      "Animation basics, voice and sound (Animation & Storytelling); AI-assisted visuals and editing (AI Filmmaking); digital art and interactive storytelling (Creative Technology)",
      "A short animated or film project created during the workshop",
      "A confirmation email for your registration",
    ],
    eligibility: "Students. The audience and any age range are stated on each workshop listing.",
    delivery: "In person, at the date, time and venue shown on the workshop listing.",
    limitations: "Seats are limited where a capacity is shown. Registration closes when seats are full or the registration period ends.",
  },
  {
    name: "Teacher workshops",
    icon: "book",
    description:
      "Creative teaching with technology for educators: lesson planning, story-based learning and classroom use of JaaDeX Animate.",
    receives: [
      "Creative lesson planning and story-based learning methods",
      "Animation activities for the classroom",
      "JaaDeX Animate training",
      "Guidance on supporting student projects",
      "A confirmation email for your registration",
    ],
    eligibility: "Teachers and educators.",
    delivery: "In person, at the date, time and venue shown on the workshop listing.",
    limitations: "Seats are limited where a capacity is shown.",
  },
  {
    name: "Events and industry workshops",
    icon: "film",
    description:
      "A practical workshop for aspiring filmmakers and creators on developing a creative idea into a complete screen project.",
    receives: [
      "Guidance on developing a creative idea into a screen project",
      "Practical creative activities",
      "A confirmation email for your registration",
    ],
    eligibility: "Aspiring filmmakers and creators. Any age range is stated on the listing.",
    delivery: "In person, at the date, time and venue shown on the workshop listing.",
    limitations: "Format and content vary by event and are described on each listing.",
  },
  {
    name: "Custom programmes for institutions",
    icon: "handshake",
    description:
      "Workshops designed around the audience and goals of a school, college, university, organization or creative community.",
    receives: [
      "A programme designed around your audience, time available and venue",
      "Learning objectives agreed in advance",
      "Written scope and terms before you pay",
    ],
    eligibility: "Schools, colleges, universities, organizations and creative communities.",
    delivery: "Scheduled and delivered as agreed in writing.",
    limitations: "Scope and fees are agreed individually and documented in writing before any payment.",
  },
];

const detailLabels = [
  { key: "receives", label: "What you receive" },
  { key: "eligibility", label: "Eligibility" },
  { key: "delivery", label: "Delivery and participation" },
  { key: "limitations", label: "Limitations" },
] as const;

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={<>Clear offerings, <span>confirmed before you pay.</span></>}
        description="Here is what JaaDeX offers and who each offering is for. Prices are quoted in Indian Rupees (INR) for each offering and confirmed in writing before any payment is requested."
        art="💡"
      >
        <ButtonLink href="/workshops">View upcoming workshops ↗</ButtonLink>
        <ButtonLink href="/contact" variant="light">Request a quote</ButtonLink>
      </PageHero>

      <Section>
        <Container>
          <SectionHeading eyebrow="Our offerings" title="What you can book with JaaDeX." description="Each offering lists its price basis, what you receive and any conditions that apply." />
          <div className="mx-auto grid max-w-[1000px] gap-[18px]">
            {offerings.map((offering) => (
              <article key={offering.name} className="rounded-[24px] border border-line bg-paper p-[22px] shadow-soft md:p-[30px]">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#e2ebff] text-royal" aria-hidden="true">
                    <Icon name={offering.icon} size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[22px] leading-[1.2] font-black tracking-[-0.5px] text-navy md:text-[24px]">{offering.name}</h2>
                    <p className="mt-2 text-[15px] leading-[1.7] text-muted">{offering.description}</p>
                  </div>
                  <p className="rounded-full bg-[#fff1e4] px-4 py-2 text-[13px] font-black text-orange-dark">Price: quoted in INR on request</p>
                </div>

                <dl className="mt-6 grid gap-5 border-t border-line pt-6 md:grid-cols-2">
                  {detailLabels.map(({ key, label }) => (
                    <div key={key} className={key === "receives" ? "md:col-span-2" : ""}>
                      <dt className="text-[12px] font-black tracking-[1.2px] text-orange uppercase">{label}</dt>
                      <dd className="mt-2 text-[14px] leading-[1.7] text-muted">
                        {key === "receives" ? (
                          <ul className="grid list-disc gap-1.5 pl-5">
                            {offering.receives.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          offering[key]
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-[#f6f8ff]">
        <Container className="max-w-[820px]">
          <h2 className="mb-4 font-display text-[clamp(26px,3.4vw,34px)] leading-[1.15] font-black tracking-[-1px] text-navy">How pricing and payment work</h2>
          <ul className="grid list-disc gap-3 pl-5 text-[15px] leading-[1.75] text-muted">
            <li>Prices for each offering are shown in Indian Rupees (INR). Where a price is not published on this page, JaaDeX will confirm it to you in writing before you pay.</li>
            <li>Workshop seats are reserved through your JaaDeX account. You receive a confirmation email when your registration is saved.</li>
            <li>No fee is charged without you first being told the amount and the cancellation terms that apply.</li>
            <li>Cancellations, refunds and delivery are covered by the <a className="font-bold text-royal underline-offset-4 hover:underline" href="/refund-policy">Refund &amp; Cancellation Policy</a> and the <a className="font-bold text-royal underline-offset-4 hover:underline" href="/shipping-policy">Shipping &amp; Delivery Policy</a>.</li>
          </ul>
        </Container>
      </Section>

      <CalloutBand title="Not sure which offering fits?" description="Tell us about your school, class, workshop or creative goal and we will suggest a suitable option and a quote."><ButtonLink href="/contact">Contact us →</ButtonLink></CalloutBand>
    </>
  );
}
