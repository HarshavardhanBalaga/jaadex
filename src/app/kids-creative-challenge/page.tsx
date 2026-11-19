import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { Brand } from "@/components/Brand";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { CreativePlaceholder } from "@/components/kids/CreativePlaceholder";
import {
  benefits,
  eligibility,
  finalCta,
  footer,
  hero,
  howToJoin,
  introduction,
  mission,
  navLinks,
  placeholders,
  prizes,
  registrationHref,
} from "@/data/kids-challenge";

export const metadata: Metadata = {
  title: "Kids Creative Challenge",
  description: hero.description,
};

type IconName = ComponentProps<typeof Icon>["name"];

/** Icons per card, in the order the supplied copy lists them. */
const introIcons: IconName[] = ["wand", "bulb", "graduation"];
const missionIcons: IconName[] = ["book", "pencil", "clapperboard", "presentation"];
const benefitIcons: IconName[] = ["book", "pencil", "users", "dashboard", "sparkles", "graduation"];
const benefitTones = ["blue", "peach", "lilac", "mint", "blue", "peach"] as const;

export default function KidsCreativeChallengePage() {
  return (
    <>
      {/* Own header for this page: brand, page links and the register button. Sticks to the top. */}
      <header className="sticky top-0 z-20 border-b border-royal/10 bg-paper/95 backdrop-blur-md">
        <Container className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3 md:h-[76px] md:flex-nowrap md:py-0">
          <Brand />
          <nav aria-label="Challenge sections" className="order-last -mx-1 flex w-full min-w-0 items-center gap-5 overflow-x-auto px-1 text-[14px] font-black whitespace-nowrap text-[#2b3a78] [scrollbar-width:none] md:order-none md:w-auto md:flex-1 md:justify-center md:overflow-visible">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="shrink-0 rounded-md py-1 hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange">
                {link.label}
              </a>
            ))}
          </nav>
          <ButtonLink href={registrationHref} size="small">Register – ₹99</ButtonLink>
        </Container>
      </header>

      {/* Hero */}
      <section className="bg-hero-wash py-[72px] md:py-[96px]">
        <Container className="text-center">
          <div className="mx-auto max-w-[820px]">
            <Eyebrow>✦ {hero.eyebrow}</Eyebrow>
            <h1 className="mx-auto my-5 max-w-[760px] font-display text-5xl leading-[1.02] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(40px,5vw,62px)]">
              {hero.heading}
            </h1>
            <p className="mx-auto mb-3 max-w-[680px] font-display text-[clamp(20px,2.4vw,26px)] leading-[1.3] font-bold text-royal">{hero.headline}</p>
            <p className="mx-auto mb-[28px] max-w-[680px] text-[16px] leading-[1.75] text-[#4a5a85]">{hero.description}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={registrationHref}>{hero.cta}</ButtonLink>
              <span className="rounded-full bg-gold px-4 py-2 font-display text-[16px] font-black text-navy">{hero.price}</span>
            </div>
            <p className="mt-6 font-display text-[17px] font-bold text-orange">{hero.tagline}</p>
          </div>
          <div className="mx-auto mt-12 max-w-[900px]">
            <CreativePlaceholder description={placeholders.hero} ratio="16 / 9">
              <span className="flex gap-4">
                {hero.icons.map((icon) => (
                  <span key={icon}>{icon}</span>
                ))}
              </span>
            </CreativePlaceholder>
          </div>
        </Container>
      </section>

      {/* Challenge introduction */}
      <Section id="challenge" className="scroll-mt-28">
        <Container>
          <SectionHeading eyebrow="The challenge" title={introduction.heading} description={introduction.subheading} />
          <FeatureGrid>
            {introduction.highlights.map((highlight, index) => (
              <FeatureCard
                key={highlight}
                tone={(["blue", "peach", "lilac"] as const)[index]}
                icon={<Icon name={introIcons[index]} size={32} />}
                title={highlight}
                description=""
              />
            ))}
          </FeatureGrid>
          <div className="mt-[17px]">
            <CreativePlaceholder description={placeholders.introduction} ratio="21 / 9" />
          </div>
        </Container>
      </Section>

      {/* Creative mission */}
      <Section id="mission" className="scroll-mt-28 bg-[#f6f8ff]">
        <Container>
          <SectionHeading eyebrow={mission.sectionLabel} title={mission.heading} description={mission.description} />
          <div className="mb-[17px] grid gap-[17px] sm:grid-cols-2 lg:grid-cols-4">
            {[placeholders.chooseLesson, placeholders.createComic, placeholders.animate, placeholders.submit].map((art) => (
              <CreativePlaceholder key={art} description={art} ratio="4 / 3" />
            ))}
          </div>
          <FeatureGrid columns={4}>
            {mission.steps.map((step, index) => (
              <FeatureCard
                key={step.number}
                tone={(["blue", "peach", "lilac", "mint"] as const)[index]}
                icon={<Icon name={missionIcons[index]} size={32} />}
                title={`${step.number} — ${step.title}`}
                description={step.description}
              />
            ))}
          </FeatureGrid>
        </Container>
      </Section>

      {/* Registration benefits */}
      <Section id="benefits" className="scroll-mt-28">
        <Container>
          <SectionHeading eyebrow={benefits.sectionLabel} title={benefits.heading} description={benefits.description} />
          <div className="mb-[17px] rounded-[32px] bg-linear-[120deg,#dce8ff,#ffe6d3] px-6 py-[30px] text-center md:p-[43px]">
            <p className="font-display text-[64px] leading-none font-black text-navy">{benefits.price}</p>
            <p className="mt-3 text-[13px] font-black tracking-[1.6px] text-royal uppercase">{benefits.priceNote}</p>
          </div>
          <FeatureGrid>
            {benefits.cards.map((card, index) => (
              <FeatureCard
                key={card.title}
                tone={benefitTones[index]}
                icon={<Icon name={benefitIcons[index]} size={32} />}
                title={card.title}
                description={card.description}
              />
            ))}
          </FeatureGrid>
          <p className="mx-auto mt-8 max-w-[760px] rounded-[20px] border border-line bg-paper p-5 text-center text-[14px] leading-[1.7] font-bold text-navy">
            {benefits.disclaimer}
          </p>
        </Container>
      </Section>

      {/* Recognition & rewards */}
      <Section id="prizes" className="scroll-mt-28 bg-[#f6f8ff]">
        <Container>
          <SectionHeading eyebrow={prizes.sectionLabel} title={prizes.heading} description={prizes.description} />
          <FeatureGrid columns={4}>
            {prizes.cards.map((card, index) => (
              <FeatureCard
                key={card.label}
                tone={(["peach", "blue", "lilac", "mint"] as const)[index]}
                icon={<span className="text-3xl leading-none" aria-hidden="true">{card.medal}</span>}
                title={card.label}
                description={card.note ? `${card.amount} · ${card.note}` : card.amount}
              />
            ))}
          </FeatureGrid>
          <div className="mt-[17px]">
            <CalloutBand title={prizes.poolLabel} description={prizes.judging}>
              <ButtonLink href={registrationHref} variant="light">{hero.cta}</ButtonLink>
            </CalloutBand>
          </div>
        </Container>
      </Section>

      {/* Eligibility */}
      <Section>
        <Container>
          <SectionHeading eyebrow={eligibility.sectionLabel} title={eligibility.heading} />
          <div className="mx-auto grid max-w-[980px] gap-[17px] md:grid-cols-[1.1fr_.9fr]">
            <ul className="grid list-none gap-[13px] rounded-[25px] border border-line bg-paper p-6 md:p-7">
              {eligibility.points.map((point) => (
                <li key={point} className="flex items-center gap-3 text-[15px] font-bold text-navy">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dce8ff] text-royal" aria-hidden="true">
                    <Icon name="check" size={16} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <p className="rounded-[25px] bg-[#fff1e4] p-6 text-[15px] leading-[1.75] font-bold text-navy md:p-7">{eligibility.disclaimer}</p>
          </div>
        </Container>
      </Section>

      {/* How to join */}
      <Section id="how-to-join" className="scroll-mt-28 bg-[#f6f8ff]">
        <Container>
          <SectionHeading eyebrow={howToJoin.sectionLabel} title={howToJoin.heading} />
          <FeatureGrid columns={4}>
            {howToJoin.steps.map((step, index) => (
              <FeatureCard
                key={step}
                tone={(["blue", "peach", "lilac", "mint"] as const)[index]}
                icon={<span className="font-display text-2xl font-black" aria-hidden="true">{index + 1}</span>}
                title={`Step ${index + 1}`}
                description={step}
              />
            ))}
          </FeatureGrid>
          <p className="mx-auto mt-8 max-w-[760px] text-center text-[14px] leading-[1.7] text-muted">{howToJoin.disclaimer}</p>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section id="register" className="scroll-mt-28" topless>
        <Container>
          <ClosingCard title={finalCta.heading} description={`${finalCta.supporting} ${finalCta.description}`}>
            <ButtonLink href={registrationHref}>{finalCta.cta}</ButtonLink>
          </ClosingCard>
          <p className="mx-auto mt-6 max-w-[720px] text-center text-[14px] leading-[1.7] text-muted">{finalCta.note}</p>
        </Container>
      </Section>

      {/* Challenge details (the site footer follows) */}
      <section className="bg-midnight py-[40px] text-[#cfd9f5]">
        <Container className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="font-display text-[22px] font-black text-white">{footer.brand}</p>
            <p className="mt-2 text-[14px] text-[#aebbe0]">Organised by {footer.organisedBy}</p>
            <p className="mt-2 text-[14px] font-bold text-gold">{footer.tagline}</p>
          </div>
          <div className="grid gap-2 text-[14px] md:justify-items-end">
            <p>
              Website:{" "}
              <a href={footer.websiteHref} className="font-bold text-white underline-offset-4 hover:underline">{footer.website}</a>
            </p>
            <p>
              {footer.emailNote}{" "}
              <a href={`mailto:${footer.email}`} className="font-bold text-white underline-offset-4 hover:underline">{footer.email}</a>
            </p>
            <div className="pt-2">
              <ButtonLink href={registrationHref} size="small">{footer.cta}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
