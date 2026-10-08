import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { InfoStrip } from "@/components/InfoStrip";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SnakeTimeline } from "@/components/SnakeTimeline";

export const metadata: Metadata = { title: "Schools", description: "JaaDeX for Schools — bring storytelling, animation, and digital creativity into the classroom." };

const programIncludes = [
  { icon: "wand", label: "JaaDeX Animate software" },
  { icon: "book", label: "Creative learning curriculum" },
  { icon: "clapperboard", label: "Animation & storytelling activities" },
  { icon: "users", label: "Teacher training" },
] as const;

const programIncludesRow2 = [
  { icon: "palette", label: "Student projects" },
  { icon: "laptop", label: "Digital creation tools" },
  { icon: "handshake", label: "Implementation support" },
  { icon: "wrench", label: "Technical support" },
] as const;

const steps = [
  { number: "01", title: "School Onboarding", description: "Understand the school's requirements, infrastructure, and learning objectives." },
  { number: "02", title: "Teacher Training", description: "Train teachers to use JaaDeX and conduct creative activities effectively." },
  { number: "03", title: "Student Learning", description: "Students learn animation and storytelling through practical, hands-on activities." },
  { number: "04", title: "Project Creation", description: "Students create their own stories, characters, and animations." },
  { number: "05", title: "Showcase", description: "Student creations can be presented through exhibitions, school events, and digital showcases." },
];

export default function SchoolsPage() {
  return (
    <>
      <section className="bg-hero-wash py-[72px] md:py-[96px]">
        <Container className="mx-auto max-w-[820px] text-center">
          <Eyebrow>✦ JaaDeX for Schools</Eyebrow>
          <h1 className="mx-auto my-5 max-w-[760px] font-display text-5xl leading-[1.02] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(40px,5vw,62px)]">
            Transforming Classrooms Through Creativity &amp; Technology
          </h1>
          <p className="mx-auto mb-[28px] max-w-[680px] text-[16px] leading-[1.75] text-[#4a5a85]">
            JaaDeX helps schools bring storytelling, animation, and digital creativity
            into the classroom—giving students the tools to imagine, create, and communicate.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Partner With JaaDeX ↗</ButtonLink>
            <ButtonLink href="/contact?interest=Product%20Demonstration" variant="light">Request School Demo</ButtonLink>
          </div>
        </Container>
      </section>


      <Section>
        <Container>
          <SectionHeading eyebrow="What We Offer" title="JaaDeX School Program" description="A structured creative-learning program designed for schools to introduce animation and digital storytelling into education." />
          <p className="mb-6 text-center text-[13px] font-black tracking-[1.4px] text-royal uppercase">The Program Includes</p>
          <ul className="mx-auto grid max-w-[980px] grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {programIncludes.map((item) => (
              <li key={item.label} className="flex items-center gap-3 rounded-[18px] border border-line bg-paper px-[16px] py-[15px]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#e2ebff] text-royal" aria-hidden="true"><Icon name={item.icon} size={20} /></span>
                <span className="text-[14px] leading-[1.45] font-bold text-navy">{item.label}</span>
              </li>
            ))}
          </ul>
          <ul className="mx-auto mt-[14px] grid max-w-[980px] grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {programIncludesRow2.map((item) => (
              <li key={item.label} className="flex items-center gap-3 rounded-[18px] border border-line bg-paper px-[16px] py-[15px]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#e2ebff] text-royal" aria-hidden="true"><Icon name={item.icon} size={20} /></span>
                <span className="text-[14px] leading-[1.45] font-bold text-navy">{item.label}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="bg-[#f6f8ff]">
        <Container>
          <SectionHeading eyebrow="Why JaaDeX?" title="Learning that starts with creating." description="Students build real creative confidence — from imagination and visual thinking to digital skills and communication." />
          <FeatureGrid columns={3}>
            <FeatureCard tone="blue" icon={<Icon name="wand" size={32} />} title="Learn by Creating" description="Students don't just consume digital content—they create it." />
            <FeatureCard tone="peach" icon={<Icon name="palette" size={32} />} title="Build Creativity" description="Develop imagination, visual thinking, and storytelling skills." />
            <FeatureCard tone="lilac" icon={<Icon name="laptop" size={32} />} title="Develop Digital Skills" description="Introduce students to animation, digital art, and creative technology." />
            <FeatureCard tone="mint" icon={<Icon name="presentation" size={32} />} title="Improve Communication" description="Storytelling helps students express ideas with greater confidence." />
            <FeatureCard tone="blue" icon={<Icon name="graduation" size={32} />} title="Future-Ready Learning" description="Prepare students for the growing creative technology ecosystem." />
            <FeatureCard tone="peach" icon={<Icon name="school" size={32} />} title="Built for Classrooms" description="Curriculum, teacher training, and implementation support designed around school goals." />
          </FeatureGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="How It Works" title="From onboarding to showcase." description="A clear, guided journey from first discussion to confident student creation." />
          <SnakeTimeline steps={steps} />
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Bring Creative Technology Into Your School" description="Partner with JaaDeX to build the next generation of creators.">
            <ButtonLink href="/contact?interest=Product%20Demonstration">Request School Demo ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
    </>
  );
}
