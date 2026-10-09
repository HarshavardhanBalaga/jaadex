import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import Image from "next/image";

type PhotoCardProps = {
  src: string;
  alt: string;
  title: string;
  description: string;
};

function PhotoCard({ src, alt, title, description }: PhotoCardProps) {
  return (
    <article className="group overflow-hidden rounded-[25px] border border-line bg-paper shadow-[0_8px_22px_rgb(20_60_160/0.05)]">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
      <div className="px-[21px] py-6">
        <h3 className="mb-2 font-display text-[19px] font-black text-navy">{title}</h3>
        <p className="text-[13px] leading-[1.65] text-[#53628a]">{description}</p>
      </div>
    </article>
  );
}
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = { title: "Workshops", description: "JaaDeX workshops — animation, storytelling, AI filmmaking, creative technology, and industry programs for students, teachers, and creators." };

export default function WorkshopsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-hero-wash py-[72px] md:py-[96px]">
        <Container className="mx-auto max-w-[820px] text-center">
          <Eyebrow>✦ JaaDeX Workshops</Eyebrow>
          <h1 className="mx-auto my-5 max-w-[760px] font-display text-5xl leading-[1.02] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(40px,5vw,62px)]">
            Learn. Create. Experiment.
          </h1>
          <p className="mx-auto mb-[28px] max-w-[680px] text-[16px] leading-[1.75] text-[#4a5a85]">
            JaaDeX workshops give students, teachers, creators, and aspiring
            filmmakers hands-on experience with animation, storytelling,
            and emerging creative technologies.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="#workshops">Explore Workshops ↗</ButtonLink>
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration" variant="light">Request a Workshop</ButtonLink>
          </div>
        </Container>
      </section>

    

      {/* Workshop categories — first 3 themes */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Workshop Themes" title="What our workshops cover." description="Five focus areas adapted to the audience, time available, venue, and learning objectives." />
          <div className="grid grid-cols-1 gap-[17px] md:grid-cols-3">
            <PhotoCard src="/assets/workshop-education.jpg" alt="Students learning with creative technology in a classroom" title="Education Workshops" description="Creative technology and digital learning programs." />
            <PhotoCard src="/assets/workshop-animation.jpg" alt="Hands-on drawing and animation activity" title="Animation Workshops" description="Hands-on animation and storytelling experiences." />
            <PhotoCard src="/assets/workshop-collab.jpg" alt="Team collaborating on an innovation challenge" title="Innovation Events" description="Hackathons, idea challenges, and creative problem-solving activities." />
          </div>
        </Container>
      </Section>

      {/* Workshops list — right after the first two sections */}
      <Section>
        <Container>
          <div id="workshops" className="scroll-mt-24">
            <SectionHeading eyebrow="Workshops" title="Currently on the calendar." description="Only one workshop listed for now — more programs will appear here as they are announced." />
          </div>
          <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-[17px] md:grid-cols-2">
            <article className="relative flex flex-col overflow-hidden rounded-[25px] border border-line bg-paper shadow-[0_8px_22px_rgb(20_60_160/0.05)]">
              <div className="relative h-52 overflow-hidden">
                <Image src="/assets/workshop-showcase.jpg" alt="Amaravati Creative Economy Workshop gathering" fill className="object-cover" sizes="(max-width: 768px) 100vw, 480px" />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#34a334] px-3.5 py-1.5 text-[11px] font-black tracking-[1px] text-white uppercase">
                  <span className="size-1.5 rounded-full bg-white" aria-hidden="true" /> Completed
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Featured Workshop</div>
              <h3 className="my-2 font-display text-[clamp(22px,2.5vw,28px)] leading-[1.1] font-black tracking-[-1px] text-navy">Amaravati Creative Economy Workshop</h3>
              <p className="text-[13px] font-bold text-royal">25 September 2026 · RTIH, Mangalagiri, Andhra Pradesh</p>
              <p className="mt-3 text-[14px] leading-[1.7] text-muted">
                A platform bringing together young creators, innovators, storytellers,
                artists, entrepreneurs, and technology enthusiasts to explore new
                opportunities in the creative economy.
              </p>
              <div className="mt-5">
                <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration" variant="dark">Ask about this workshop ↗</ButtonLink>
              </div>
              </div>
            </article>
            <article className="relative flex flex-col overflow-hidden rounded-[25px] border border-dashed border-line bg-paper/60">
              <div className="relative grid h-52 place-items-center overflow-hidden bg-[#eef3ff] text-[40px]" aria-hidden="true">✦</div>
              <div className="p-6 text-center md:p-8">
                <h3 className="font-display text-[17px] font-bold text-navy">More workshops coming soon</h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-[1.7] text-muted">New programs for students, teachers, and creators will be announced here.</p>
              </div>
            </article>
          </div>
        </Container>
      </Section>

      {/* Remaining themes */}
      <Section>
        <Container>
          <SectionHeading eyebrow="More Themes" title="And beyond the classroom." description="Technology, creative economy, and fully custom programs." />
          <ul className="mx-auto grid max-w-[860px] grid-cols-1 gap-[14px]">
            <li className="flex items-center gap-4 rounded-[18px] border border-line bg-paper px-[18px] py-[16px]">
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-[14px]" aria-hidden="true"><Image src="/assets/workshop-filmmaking.jpg" alt="" fill className="object-cover" sizes="44px" /></span>
              <div>
                <h3 className="font-display text-[16px] font-bold text-navy">AI &amp; Technology Workshops</h3>
                <p className="text-[13px] leading-[1.6] text-muted">Exploring emerging technologies and their creative applications.</p>
              </div>
            </li>
            <li className="flex items-center gap-4 rounded-[18px] border border-line bg-paper px-[18px] py-[16px]">
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-[14px]" aria-hidden="true"><Image src="/assets/workshop-showcase.jpg" alt="" fill className="object-cover" sizes="44px" /></span>
              <div>
                <h3 className="font-display text-[16px] font-bold text-navy">Creative Economy Events</h3>
                <p className="text-[13px] leading-[1.6] text-muted">Connecting creativity, culture, entrepreneurship, and opportunities.</p>
              </div>
            </li>
            <li className="flex flex-wrap items-center gap-4 rounded-[18px] border border-royal/20 bg-gradient-to-br from-[#eef3ff] via-white to-[#fff3e6] px-[18px] py-[16px]">
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-[14px]" aria-hidden="true"><Image src="/assets/workshop-collab.jpg" alt="" fill className="object-cover" sizes="44px" /></span>
              <div className="min-w-[200px] flex-1">
                <h3 className="font-display text-[16px] font-bold text-navy">Need something custom?</h3>
                <p className="text-[13px] leading-[1.6] text-muted">Workshops designed around your institution, audience, and objectives.</p>
              </div>
              <a href="/contact?interest=Partnership%20or%20Collaboration" className="inline-flex items-center gap-1.5 rounded-full border border-royal/25 bg-white px-4 py-2 text-[13px] font-black text-royal transition-colors hover:border-royal hover:text-orange">
                Design one with us <span aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </Container>
      </Section>

      {/* Workshops for Students */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Workshops for Students" title="Hands-on tracks for young creators." description="Three practical workshops that turn ideas into visual stories and digital creations." />
          <div className="grid grid-cols-1 gap-[17px] md:grid-cols-3">
            <PhotoCard src="/assets/workshop-students.jpg" alt="Students working together on a creative classroom project" title="Animation & Storytelling Workshop" description="Turn an Idea Into a Visual Story. Students learn how to transform an idea into a visual story — story ideas, characters, storyboarding, animation basics, scene design, voice and sound, and a short animated project." />
            <PhotoCard src="/assets/workshop-filmmaking.jpg" alt="Filmmaking equipment used in an AI filmmaking workshop" title="AI Filmmaking Workshop" description="Discover the Future of Storytelling. How emerging AI tools support filmmaking — story development, AI-assisted visuals, character concepts, image and video generation, AI voice and sound, editing, and short-film creation." />
            <PhotoCard src="/assets/workshop-learn.jpg" alt="Young learner exploring creative technology" title="Creative Technology Workshop" description="Technology as a Tool for Creativity. Students discover technology as a medium for expression — digital art, animation, interactive storytelling, creative AI, character design, and digital content creation." />
          </div>
        </Container>
      </Section>

      {/* Workshops for Teachers */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Workshops for Teachers" title="Creative Teaching With Technology" description="Help teachers integrate animation and storytelling into classroom learning — creative lesson planning, story-based learning, animation activities, JaaDeX Animate training, student project guidance, and classroom implementation." />
          <ul className="mx-auto grid max-w-[860px] grid-cols-1 gap-[14px]">
            <li className="rounded-[18px] border border-line bg-gradient-to-br from-[#eef3ff]/60 via-white to-white px-[18px] py-[16px]">
              <h3 className="font-display text-[16px] font-bold text-navy">Creative Lesson Planning</h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-muted">Design story-based lessons that bring animation and visual thinking into everyday teaching.</p>
            </li>
            <li className="rounded-[18px] border border-line bg-gradient-to-br from-[#eef3ff]/60 via-white to-white px-[18px] py-[16px]">
              <h3 className="font-display text-[16px] font-bold text-navy">JaaDeX Animate Training</h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-muted">Hands-on training so teachers can confidently run animation activities and guide student projects.</p>
            </li>
            <li className="rounded-[18px] border border-line bg-gradient-to-br from-[#eef3ff]/60 via-white to-white px-[18px] py-[16px]">
              <h3 className="font-display text-[16px] font-bold text-navy">Classroom Implementation</h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-muted">Practical guidance on student project workflows, showcases, and sustaining creative learning.</p>
            </li>
          </ul>
        </Container>
      </Section>

      {/* Events & Industry Workshops */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Events & Industry Workshops" title="From Idea to Screen" description="A practical workshop for aspiring filmmakers and creators exploring how a creative idea can develop into a complete screen project." />
          <ol className="relative mx-auto grid max-w-[1000px] list-none grid-cols-2 gap-[20px] p-0 sm:grid-cols-3 lg:grid-cols-7 lg:gap-[10px]" aria-label="Creative pipeline">
            <span className="absolute top-6 right-[7%] left-[7%] hidden h-[4px] rounded-full bg-gradient-to-r from-[#1450d6] via-[#18a8ee] to-[#f4690d] opacity-30 lg:block" aria-hidden="true" />
            {["Idea", "Story", "Screenplay", "Visual Development", "Production", "Editing", "Distribution"].map((step, index) => (
              <li key={step} className="relative flex flex-col items-center text-center">
                <span className="z-10 grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#1450d6] via-[#18a8ee] to-[#f4690d] text-[12px] font-black text-white shadow-[0_0_0_5px_rgb(255_255_255),0_8px_20px_rgb(20_80_214/0.3)]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 max-w-[140px] font-display text-[14px] leading-[1.3] font-bold text-navy">{step}</h3>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Workshop Format */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Workshop Format" title="How every workshop runs." description="A simple four-step rhythm — learn, create, collaborate, showcase." />
          <div className="grid grid-cols-1 gap-[17px] sm:grid-cols-2 lg:grid-cols-4">
            <PhotoCard src="/assets/workshop-learn.jpg" alt="Participant learning fundamentals in a workshop" title="Learn" description="Understand the fundamentals through simple demonstrations and guided instruction." />
            <PhotoCard src="/assets/workshop-animation.jpg" alt="Participant creating during a hands-on activity" title="Create" description="Apply what you learn through a practical creative activity." />
            <PhotoCard src="/assets/workshop-collab.jpg" alt="Teams collaborating to refine ideas" title="Collaborate" description="Work together in teams to develop and refine ideas." />
            <PhotoCard src="/assets/workshop-cinema.jpg" alt="Final creations presented to an audience" title="Showcase" description="Present the final creation to teachers, peers, and industry professionals." />
          </div>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Bring a JaaDeX Workshop to Your Institution" description="Whether you are a school, college, university, organization, or creative community, JaaDeX can design workshops based on your audience and objectives.">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Request a Workshop ↗</ButtonLink>
              <ButtonLink href="/contact" variant="light">Talk to Our Team</ButtonLink>
            </div>
          </ClosingCard>
        </Container>
      </Section>
    </>
  );
}
