import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ButtonLink } from "@/components/ButtonLink";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import {
  benefits,
  eligibility,
  finalCta,
  footer,
  hero,
  mission,
  prizes,
  registrationHref,
} from "@/data/kids-challenge";

export const metadata: Metadata = {
  title: "Kids Creative Challenge",
  description: hero.description,
};

/** Icons per card, in the order the supplied copy lists them. */

export default function KidsCreativeChallengePage() {
  return (
    <>
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
          <div className="mx-auto mt-12 max-w-[900px] overflow-hidden rounded-[26px] border border-line shadow-[0_18px_40px_-24px_rgba(20,40,100,0.35)]">
            <img
              src="/assets/kids-creative/poster.png"
              alt="Kids Creative Challenge poster: top 10 student winners, prize amounts and ₹99 per student entry"
              className="block w-full"
            />
          </div>
        </Container>
      </section>

      {/* Creative mission */}
      <Section id="mission" className="scroll-mt-28 bg-[#f6f8ff]">
        <Container>
          <SectionHeading eyebrow={mission.sectionLabel} title={mission.heading} description={mission.description} />
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.3fr_.7fr]">
            <img
              src="/assets/kids-creative/mission.png"
              alt="Four steps: choose a lesson, create a comic, animate your story, then submit it through the JaaDeX student dashboard"
              loading="lazy"
              className="w-full rounded-[28px] border border-line bg-paper shadow-[0_18px_40px_-24px_rgba(20,40,100,0.35)]"
            />
            <ol className="grid list-none gap-7">
              {mission.steps.map((step) => (
                <li key={step.number} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-royal font-display text-[15px] font-black text-white" aria-hidden="true">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-display text-[20px] leading-tight font-black text-navy">{step.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-[1.7] text-[#4a5a85]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      {/* Registration benefits */}
      <Section id="benefits" className="scroll-mt-28 bg-[#FAFBFF]">
        <Container>
          <SectionHeading eyebrow={benefits.sectionLabel} title={benefits.heading} description={benefits.description} />
          <div className="relative mx-auto flex max-w-[860px] flex-col items-center gap-4 md:block md:h-[720px]">
            {/* Ambient glow behind the centre */}
            <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 hidden size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,150,70,0.18),rgba(255,150,70,0)_70%)] md:block" />

            {/* Faint circular surface + dashed orbit (perfect circle, desktop only) */}
            <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 hidden size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-royal/50 bg-[radial-gradient(circle,rgba(255,232,214,0.5),rgba(255,232,214,0)_72%)] md:block" />

            {/* Centre: entry fee */}
            <div className="relative z-10 mb-2 grid size-[220px] place-items-center rounded-full bg-linear-[135deg,#ffe8d6,#ffc999] text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-12px_24px_rgba(40,70,160,0.08),0_2px_4px_rgba(20,40,100,0.08),0_16px_32px_-8px_rgba(40,70,160,0.25),0_40px_60px_-24px_rgba(40,70,160,0.3)] md:absolute md:top-1/2 md:left-1/2 md:mb-0 md:-translate-x-1/2 md:-translate-y-1/2">
              <div>
                <p className="font-display text-[56px] leading-none font-black text-navy [text-shadow:0_1px_0_rgba(255,255,255,0.8)]">{benefits.price}</p>
                <p className="mt-2 px-4 text-[11px] font-black tracking-[1.4px] text-royal uppercase">{benefits.priceNote}</p>
              </div>
            </div>

            {/* Benefits orbit around the centre on desktop, stack on mobile */}
            {benefits.cards.map((card, index) => {
              const angle = ((-90 + index * 60) * Math.PI) / 180;
              const orbit = {
                "--x": `${Math.round(280 * Math.cos(angle))}px`,
                "--y": `${Math.round(280 * Math.sin(angle))}px`,
              } as CSSProperties;
              return (
                <div
                  key={card.title}
                  style={orbit}
                  className="relative w-full max-w-[360px] rounded-[24px] border border-[#d3e0fa] bg-linear-[180deg,#ffffff,#f4f8ff] p-5 text-center shadow-[0_1px_2px_rgba(20,40,100,0.05),0_8px_20px_-10px_rgba(40,70,160,0.16),0_24px_44px_-24px_rgba(40,70,160,0.22)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(20,40,100,0.06),0_16px_30px_-12px_rgba(40,70,160,0.22),0_32px_60px_-24px_rgba(40,70,160,0.3)] md:absolute md:top-1/2 md:left-1/2 md:w-[230px] md:max-w-none md:[transform:translate(calc(-50%_+_var(--x)),calc(-50%_+_var(--y)))]"
                >
                  <h3 className="font-display text-[17px] leading-tight font-black text-navy">{card.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.6] text-[#4a5a85]">{card.description}</p>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-8 max-w-[760px] rounded-[20px] border border-line bg-paper p-5 text-center text-[14px] leading-[1.7] font-bold text-navy">
            {benefits.disclaimer}
          </p>
        </Container>
      </Section>

      {/* Recognition & rewards */}
      <Section id="prizes" className="scroll-mt-28">
        <Container>
          <div className="mx-auto max-w-[760px] text-center">
            <p className="inline-flex rounded-full border border-royal/20 bg-white px-4 py-1.5 text-[13px] font-black tracking-[1.6px] text-royal uppercase">
              {prizes.sectionLabel}
            </p>
            <h2 className="mt-5 font-display text-[clamp(32px,4vw,46px)] leading-[1.08] font-black tracking-[-1px] text-navy">{prizes.heading}</h2>
            <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-[1.75] text-[#4a5a85]">{prizes.description}</p>
          </div>

          {/* Pool total sits on top of the podium */}
          <div className="mt-12 text-center">
            <p className="inline-flex rounded-full bg-gold px-7 py-3.5 font-display text-[clamp(22px,3vw,30px)] leading-tight font-black text-navy">{prizes.poolLabel}</p>
          </div>

          {/* Podium: 2nd, 1st (tallest, centre), 3rd; label and amount sit inside each step */}
          <div className="mx-auto mt-10 grid max-w-[860px] grid-cols-3 items-end gap-3 md:gap-6">
            {[
              { prize: prizes.cards[1], step: "h-40 md:h-48", base: "bg-linear-[180deg,#f1f4f9,#d9e0ec]" },
              { prize: prizes.cards[0], step: "h-56 md:h-68", base: "bg-linear-[180deg,#fdf1c9,#f7dc8f]" },
              { prize: prizes.cards[2], step: "h-32 md:h-36", base: "bg-linear-[180deg,#f8e6d8,#ecc7a6]" },
            ].map(({ prize, step, base }) => (
              <div key={prize.label} className="flex flex-col items-center text-center">
                <span className="text-[40px] leading-none md:text-[52px]" aria-hidden="true">{prize.medal}</span>
                <div className={`mt-3 flex w-full flex-col items-center rounded-t-[22px] px-3 pt-5 ${step} ${base}`}>
                  <p className="font-display text-[12px] font-black tracking-[1.4px] text-[#4a5a85] uppercase">{prize.label}</p>
                  <p className="mt-1 font-display text-[clamp(20px,2.6vw,30px)] leading-tight font-black text-navy">{prize.amount}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ranks 4–10 as a single strip */}
          <div className="mx-auto mt-6 flex max-w-[560px] flex-col items-center gap-1 rounded-[24px] border border-[#ffd9b8] bg-linear-[135deg,#fff8f1,#ffe9d6] px-6 py-5 text-center shadow-[0_1px_2px_rgba(200,90,20,0.06),0_14px_28px_-16px_rgba(230,120,50,0.35)] md:flex-row md:justify-between md:gap-6 md:px-8 md:text-left">
            <div>
              <p className="font-display text-[20px] font-black text-navy">{prizes.cards[3].label}</p>
              {prizes.cards[3].note ? <p className="text-[14px] text-[#4a5a85]">{prizes.cards[3].note}</p> : null}
            </div>
            <p className="font-display text-[clamp(26px,3vw,32px)] leading-none font-black text-navy">{prizes.cards[3].amount}</p>
          </div>

          {/* Judging and call to action */}
          <div className="mx-auto mt-12 grid max-w-[860px] gap-6 border-t border-line pt-10 md:grid-cols-[1fr_auto] md:items-center">
            <p className="text-[14px] leading-[1.7] text-muted">{prizes.judging}</p>
            <ButtonLink href={registrationHref}>{hero.cta}</ButtonLink>
          </div>
        </Container>
      </Section>

      {/* Eligibility */}
      <Section>
        <Container>
          <SectionHeading eyebrow={eligibility.sectionLabel} title={eligibility.heading} />
          <div className="mx-auto grid max-w-[980px] gap-6 md:grid-cols-[1.25fr_.75fr] md:items-center md:gap-10">
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
            <p className="rounded-[25px] bg-[#fff1e4] p-6 text-[15px] leading-[1.75] font-medium text-[#4a5a85] md:p-7">{eligibility.disclaimer}</p>
          </div>
        </Container>
      </Section>

      {/* Final CTA */}
      <Section id="register" className="scroll-mt-28" topless>
        <Container>
          <ClosingCard title={finalCta.heading} description={finalCta.description}>
            <ButtonLink href={registrationHref}>{finalCta.cta}</ButtonLink>
          </ClosingCard>
          
        </Container>
      </Section>

      {/* Challenge details (the site footer follows) */}
      <section className="scroll-mt-28 py-16 md:py-20">
        <Container className="text-center">
          <div className="mx-auto max-w-[560px]">
            <p className="font-display text-[26px] font-black text-navy">{footer.brand}</p>
            <p className="mt-2 text-[14px] text-muted">Organised by {footer.organisedBy}</p>
            <p className="mt-3 font-display text-[16px] font-black text-orange">{footer.tagline}</p>
            <p className="mt-6 text-[14px] text-[#4a5a85]">
              Website:{" "}
              <a href={footer.websiteHref} className="font-bold text-navy underline-offset-4 hover:underline">{footer.website}</a>
            </p>
            <p className="mt-1 text-[14px] text-[#4a5a85]">
              {footer.emailNote}{" "}
              <a href={`mailto:${footer.email}`} className="font-bold text-navy underline-offset-4 hover:underline">{footer.email}</a>
            </p>
            <div className="mt-8">
              <ButtonLink href={registrationHref}>{footer.cta}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
