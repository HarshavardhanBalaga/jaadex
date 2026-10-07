import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { Container } from "@/components/Container";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { InfoStrip } from "@/components/InfoStrip";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SplitFeature } from "@/components/SplitFeature";

export const metadata: Metadata = { title: "AI Filmmaking", description: "Explore JaaDeX AI filmmaking learning paths from idea and script to visuals and editing." };

export default function AIFilmmakingPage() {
  return (
    <>
      <PageHero eyebrow="Creative technology learning" title={<>From first idea <span>to first film.</span></>} description="Explore AI-assisted filmmaking as a creative process — from developing a concept and script to visual planning, video creation and editing." art="🎬">
        <ButtonLink href="/contact?interest=AI%20Filmmaking%20Courses">Enquire about courses ↗</ButtonLink>
        <ButtonLink href="#learning-path" variant="light">View learning path</ButtonLink>
      </PageHero>

      <InfoStrip items={[{ icon: "💡", label: "Ideation" }, { icon: "✍️", label: "Story & script" }, { icon: "🖼️", label: "Visual development" }, { icon: "🎞️", label: "Video workflow" }]} />

      <Section id="learning-path">
        <Container>
          <SectionHeading eyebrow="A creative workflow" title="Learn the filmmaking journey." description="Understand how storytelling, creative decisions and AI tools can work together in a filmmaking workflow." />
          <FeatureGrid columns={4}>
            <FeatureCard icon={<Icon name="bulb" size={32} />} title="01 · Idea" description="Find a concept, define your audience and shape the creative direction." />
            <FeatureCard icon={<Icon name="pencil" size={32} />} title="02 · Story" description="Develop characters, a script, scenes and a storyboard to guide the film." />
            <FeatureCard icon={<Icon name="image" size={32} />} title="03 · Visuals" description="Explore prompts, visual references and AI-assisted image or video workflows." />
            <FeatureCard icon={<Icon name="clapperboard" size={32} />} title="04 · Edit" description="Bring selected shots together, refine pacing, sound and the final presentation." />
          </FeatureGrid>
        </Container>
      </Section>

      <SplitFeature eyebrow="Creative and responsible AI" title="Use tools with purpose." description="AI can support parts of the creative process, but storytelling choices, taste, direction and review still matter. Learning should include responsible tool use and respect for rights, consent and originality." art="🤖" artLabel="Human creativity first" points={["Choose tools based on the creative task", "Iterate, review and refine generated outputs", "Respect copyright, permissions and platform policies"]}>
        <ButtonLink href="/contact?interest=AI%20Filmmaking%20Courses" variant="dark">Ask about AI filmmaking ↗</ButtonLink>
      </SplitFeature>

      <CalloutBand title="Have an idea for a film?" description="Tell us what you want to learn or build. We'll discuss current course availability and potential learning options."><ButtonLink href="/contact?interest=AI%20Filmmaking%20Courses">Talk to JaaDeX →</ButtonLink></CalloutBand>
    </>
  );
}
