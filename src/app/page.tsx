import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { FaqAccordion } from "@/components/FaqAccordion";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { InfoStrip } from "@/components/InfoStrip";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SplitFeature } from "@/components/SplitFeature";

const faqs = [
  { question: "What is JaaDeX?", answer: "JaaDeX Innovision is building a creative learning platform that brings together animation, storytelling, school education and emerging creative technologies." },
  { question: "What can schools explore with JaaDeX?", answer: "Schools can enquire about JaaDeX Animate, classroom animation activities, curriculum support, teacher onboarding and implementation planning." },
  { question: "What kinds of projects does JaaDeX work on?", answer: "JaaDeX explores educational animation, digital storytelling, original intellectual property, heritage-inspired stories and AI-assisted creative learning." },
  { question: "Can we collaborate or host a workshop with JaaDeX?", answer: "Yes. Schools, educational institutions, creative professionals and potential partners can contact the team to discuss events, training, sponsorship or project collaborations." },
];

function FloatingCard({ icon, title, caption, className }: { icon: string; title: string; caption: string; className: string }) {
  return (
    <div className={`absolute z-3 flex items-center gap-2.5 rounded-[17px] bg-[#ffffff] px-3.5 py-3 text-xs font-black shadow-soft max-[400px]:text-[10px] ${className}`}>
      <span className="grid size-[39px] place-items-center rounded-[13px] bg-[#ffe6d3] text-[22px]">{icon}</span>
      <div>
        {title}
        <small className="mt-[3px] block text-[10px] font-extrabold text-muted">{caption}</small>
      </div>
    </div>
  );
}

function Leaf({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`absolute text-4xl ${className}`}>{children}</span>;
}

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-wash py-[38px] md:py-[58px]">
        <Container className="grid items-center gap-[25px] md:grid-cols-2 md:gap-[38px]">
          <div>
            <Eyebrow>✦ Learning meets imagination</Eyebrow>
            <h1 className="my-5 text-5xl leading-[.99] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(43px,5.3vw,68px)] md:tracking-[-3px]">
              Imagine more.<span className="block text-orange">Create anything.</span>
            </h1>
            <p className="mb-[25px] max-w-[560px] leading-[1.75] text-[#4a5a85]">JaaDeX brings animation, storytelling and creative technology into learning. We help schools and young creators move from watching ideas to making their own stories, lessons and digital experiences.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/schools" className="max-[400px]:w-full">Explore school solutions <span aria-hidden="true">→</span></ButtonLink>
              <ButtonLink href="/projects" variant="light" className="max-[400px]:w-full">Discover our projects</ButtonLink>
            </div>
            <div className="mt-[22px] flex items-center gap-2.5 text-xs font-extrabold text-[#4f5f8c]"><span className="text-[22px] whitespace-nowrap">🎨 🎬 🌱</span> A creative space for learners, educators and future storytellers.</div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-[36px] border-[7px] border-white/65 bg-linear-[160deg,#6c9bf5,#2f63dc_48%,#0a2a8c] shadow-[0_22px_55px_rgb(20_60_160/0.15)] md:min-h-[350px] lg:min-h-[400px]" role="img" aria-label="Playful creative learning illustration">
            <span className="absolute top-[34px] right-[47px] size-[95px] rounded-full bg-[#ffc24a] shadow-[0_0_0_14px_rgb(255_194_74/0.15)]" />
            <Leaf className="top-12 left-[38px]">🍃</Leaf>
            <Leaf className="top-[120px] right-[25px]">🌿</Leaf>
            <span className="absolute bottom-[78px] left-[15px] text-[90px] drop-shadow-[0_8px_3px_rgb(20_70_190/0.33)]">🌴</span>
            <span className="absolute bottom-[25px] left-[18%] z-2 text-[95px] whitespace-nowrap drop-shadow-[0_13px_5px_rgb(7_7_80/0.25)] md:text-[clamp(86px,10vw,125px)]">🧑🏻‍🎨 👧🏽</span>
            <span className="absolute -bottom-[75px] -left-[8%] h-[170px] w-[120%] -rotate-5 rounded-[50%_50%_0_0] bg-midnight" />
            <FloatingCard icon="🎨" title="Ideas become creations" caption="Imagine · Create · Animate" className="top-12 -left-2.5 max-[400px]:-left-[5px]" />
            <FloatingCard icon="🚀" title="Learning in action" caption="Every idea can grow" className="right-[-8px] bottom-[45px] max-[400px]:right-[-5px]" />
          </div>
        </Container>
      </section>

      <InfoStrip items={[{ icon: "🎨", label: "Animation & storytelling" }, { icon: "🏫", label: "School learning" }, { icon: "🧩", label: "Creative projects" }, { icon: "🎤", label: "Workshops & events" }]} />

      <Section>
        <Container>
          <SectionHeading eyebrow="Welcome to JaaDeX" title="Creativity is a way to learn." description="We combine technology and imagination to help learners understand concepts, communicate ideas and develop creative confidence through hands-on experiences." />
          <FeatureGrid columns={4}>
            <FeatureCard icon={<Icon name="palette" size={32} />} title="Animation learning" description="Explore frames, layers, movement and visual storytelling through creative projects." href="/schools" linkLabel="For schools" />
            <FeatureCard icon={<Icon name="school" size={32} />} title="School partnerships" description="Work with educators to bring animation activities and creative technology into classrooms." href="/schools" linkLabel="Explore school support" />
            <FeatureCard icon={<Icon name="sparkles" size={32} />} title="Original projects" description="Develop educational content, story worlds and creative concepts with room to grow." href="/projects" linkLabel="View projects" />
            <FeatureCard icon={<Icon name="users" size={32} />} title="Events & workshops" description="Create opportunities for students, educators and creative communities to learn together." href="/events" linkLabel="Explore events" />
          </FeatureGrid>
        </Container>
      </Section>

      <SplitFeature eyebrow="Our purpose" title="Help learners become creators, not just viewers." description="JaaDeX is building approachable creative learning experiences where students can explore ideas, make animated explanations, develop stories and share what they have learned." art="🧑🏽‍💻" artLabel="Learn by creating" points={["Hands-on animation and storytelling activities", "Creative technology connected to learning goals", "Support for educators and institutions"]}>
        <ButtonLink href="/about" variant="dark">Get to know JaaDeX ↗</ButtonLink>
      </SplitFeature>

      <Section>
        <Container>
          <SectionHeading eyebrow="What we're building" title="A growing creative ecosystem." description="Our work spans learning tools, school implementation, original content and events that connect people with creative skills." />
          <FeatureGrid>
            <FeatureCard icon={<Icon name="book" size={32} />} title="Creative education" description="Learning activities that use animation and storytelling to make ideas more visual and engaging." href="/schools" />
            <FeatureCard icon={<Icon name="clapperboard" size={32} />} title="Animation & AI creativity" description="Exploring creative production workflows, visual narratives and emerging filmmaking tools." href="/projects" />
            <FeatureCard icon={<Icon name="sprout" size={32} />} title="Community & events" description="Workshops and collaborative experiences for students, educators and creative professionals." href="/events" />
          </FeatureGrid>
        </Container>
      </Section>

      <CalloutBand title="Have an idea you'd love to bring to life? ✨" description="Let's explore how JaaDeX can support your school, creative project, workshop or collaboration.">
        <ButtonLink href="/contact">Start a conversation →</ButtonLink>
        <ButtonLink href="/projects" variant="light">Explore projects</ButtonLink>
      </CalloutBand>

      <Section id="faq">
        <Container className="max-w-[900px]">
          <SectionHeading eyebrow="Good questions" title="Get to know JaaDeX" description="A few quick answers about our platform, school work, projects and events." />
          <FaqAccordion items={faqs} />
        </Container>
      </Section>
    </>
  );
}
