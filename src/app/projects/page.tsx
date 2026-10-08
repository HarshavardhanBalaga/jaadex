import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import Image from "next/image";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = { title: "Projects", description: "JaaDeX projects — Kondapalli animation IP, creative education, storytelling, cultural heritage, and creative technology." };

const visionPoints = [
  "Create original characters and stories",
  "Build a children's animation IP",
  "Introduce Kondapalli heritage to younger audiences",
  "Develop animated content and digital experiences",
  "Create opportunities for artists and creators",
  "Connect traditional craftsmanship with modern technology",
];

const approachSteps = ["Heritage", "Story", "Character", "Animation", "IP"];

export default function ProjectsPage() {
  return (
    <>
      {/* Centered hero — matches /schools style, no side illustration */}
      <section className="bg-hero-wash py-[72px] md:py-[96px]">
        <Container className="mx-auto max-w-[820px] text-center">
          <Eyebrow>✦ JaaDeX Projects</Eyebrow>
          <h1 className="mx-auto my-5 max-w-[780px] font-display text-5xl leading-[1.02] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(40px,5vw,62px)]">
            Projects That Turn Culture, Creativity &amp; Technology Into Stories
          </h1>
          <p className="mx-auto mb-[28px] max-w-[680px] text-[16px] leading-[1.75] text-[#4a5a85]">
            JaaDeX develops creative technology projects that connect storytelling,
            animation, education, and cultural heritage.
          </p>
        </Container>
      </section>

      {/* Featured project — Kondapalli Animation IP with real artwork */}
      <section className="py-[58px] md:py-[76px]">
        <Container className="grid items-center gap-[25px] md:grid-cols-[1.1fr_.9fr] md:gap-[54px]">
          <div className="relative overflow-hidden rounded-[32px] border border-line shadow-soft">
            <Image
              src="/assets/kondapalli-ip.png"
              alt="Kondapalli wooden toy characters reimagined as an animation universe"
              width={900}
              height={900}
              className="h-auto w-full object-cover"
              priority
            />
            <div className="absolute top-[22px] left-5 z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">✦ Kondapalli IP</div>
            <div className="absolute right-[18px] bottom-[22px] z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">🌟 Every idea matters</div>
          </div>
          <div>
            <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Featured Project</div>
            <h2 className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">Kondapalli Animation IP</h2>
            <p className="text-[15px] leading-[1.75] text-muted">From Traditional Wooden Toys to a New Storytelling Universe. Kondapalli Bommalu are more than traditional wooden toys. They represent the artistic heritage and cultural identity of Andhra Pradesh. JaaDeX is exploring how these iconic characters can be transformed into a new generation of animated stories and children&apos;s entertainment.</p>
            <ul className="my-[23px] grid gap-[13px]">
              {visionPoints.slice(0, 4).map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm font-extrabold text-[#2f3f7a]">
                  <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#dce8ff] text-royal"><Icon name="check" size={14} /></span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration" variant="dark">Explore the Kondapalli IP ↗</ButtonLink>
          </div>
        </Container>
      </section>

      {/* Our Vision checklist */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Our Vision" title="Where the Kondapalli IP can go." description="Six directions guiding how traditional craftsmanship meets modern storytelling and technology." />
          <ul className="mx-auto grid max-w-[980px] grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {visionPoints.map((point, index) => (
              <li key={point} className="flex items-center gap-3 rounded-[18px] border border-line bg-paper px-[16px] py-[15px]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#e2ebff] text-[14px] font-black text-royal" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[14px] leading-[1.45] font-bold text-navy">{point}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Project Categories */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Project Categories" title="Our Key Project Areas" description="From classrooms to cultural heritage — each category connects creativity with purpose." />
          <div className="grid grid-cols-1 gap-[17px] md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[25px] border border-line bg-paper px-[21px] py-6">
              <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#e2ebff] to-[#cfdefc] text-royal" aria-hidden="true"><Icon name="school" size={32} /></div>
              <h3 className="mb-2 font-display text-[19px] font-black text-navy">Creative Education Projects</h3>
              <p className="text-[13px] leading-[1.65] text-[#53628a]">Bringing animation, storytelling, and digital creativity into schools and learning environments.</p>
            </article>
            <article className="rounded-[25px] border border-line bg-paper px-[21px] py-6">
              <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#ffead3] to-[#ffd9b0] text-orange-dark" aria-hidden="true"><Icon name="clapperboard" size={32} /></div>
              <h3 className="mb-2 font-display text-[19px] font-black text-navy">Animation &amp; Storytelling</h3>
              <p className="text-[13px] leading-[1.65] text-[#53628a]">Developing original characters, stories, and animation concepts for children and young audiences.</p>
            </article>
            <article className="rounded-[25px] border border-line bg-paper px-[21px] py-6">
              <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#e8ddff] to-[#d3bfff] text-purple" aria-hidden="true"><Icon name="tree" size={32} /></div>
              <h3 className="mb-2 font-display text-[19px] font-black text-navy">Cultural Heritage Projects</h3>
              <p className="text-[13px] leading-[1.65] text-[#53628a]">Using digital storytelling and animation to preserve and promote traditional art forms.</p>
            </article>
            <article className="rounded-[25px] border border-line bg-paper px-[21px] py-6">
              <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#d5f0f3] to-[#bce4e9] text-teal" aria-hidden="true"><Icon name="wand" size={32} /></div>
              <h3 className="mb-2 font-display text-[19px] font-black text-navy">Creative Technology</h3>
              <p className="text-[13px] leading-[1.65] text-[#53628a]">Building tools and experiences that make animation and digital creation more accessible to young creators.</p>
            </article>
            <article className="rounded-[25px] border border-line bg-paper px-[21px] py-6">
              <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#e2ebff] to-[#cfdefc] text-royal" aria-hidden="true"><Icon name="users" size={32} /></div>
              <h3 className="mb-2 font-display text-[19px] font-black text-navy">Community &amp; Creator Projects</h3>
              <p className="text-[13px] leading-[1.65] text-[#53628a]">Connecting students, artists, storytellers, and creative professionals to build new opportunities.</p>
            </article>
          </div>
        </Container>
      </Section>

      {/* Our Approach — horizontal timeline */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Our Approach" title="Heritage → Story → Character → Animation → IP" description="We transform cultural ideas and creative concepts into engaging digital experiences." />
          <ol className="relative mx-auto grid max-w-[1000px] list-none grid-cols-1 gap-[20px] p-0 md:grid-cols-5 md:gap-[12px]" aria-label="Our approach timeline">
            <span className="absolute top-6 right-[10%] left-[10%] hidden h-[4px] rounded-full bg-gradient-to-r from-[#1450d6] via-[#18a8ee] to-[#f4690d] opacity-30 md:block" aria-hidden="true" />
            {approachSteps.map((step, index) => (
              <li key={step} className="relative flex flex-col items-center text-center">
                <span className="z-10 grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#1450d6] via-[#18a8ee] to-[#f4690d] text-[13px] font-black text-white shadow-[0_0_0_5px_rgb(255_255_255),0_8px_20px_rgb(20_80_214/0.3)]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-3 hidden h-6 w-[3px] rounded-full bg-gradient-to-b from-[#18a8ee] to-[#f4690d] opacity-50 md:block" aria-hidden="true" />
                <h3 className="mt-2 font-display text-[16px] font-bold text-navy">{step}</h3>
                {index < approachSteps.length - 1 ? (
                  <span className="mt-2 text-[18px] font-black text-orange md:hidden" aria-hidden="true">↓</span>
                ) : null}
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Have a Kondapalli story to tell?" description="We welcome conversations with schools, creators, cultural organizations, studios and potential project partners about the Kondapalli IP and beyond.">
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Explore the Kondapalli IP ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
    </>
  );
}
