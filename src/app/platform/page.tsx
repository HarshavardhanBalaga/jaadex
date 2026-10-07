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

export const metadata: Metadata = { title: "Creative Learning Platform", description: "Explore JaaDeX Animate, storytelling and creative learning experiences." };

export default function PlatformPage() {
  return (
    <>
      <PageHero eyebrow="The JaaDeX platform" title={<>Turn curiosity into <span>creation.</span></>} description="JaaDeX connects animation, storytelling and digital creativity in a learning experience that encourages students to explore ideas by making them real." art="🎨">
        <ButtonLink href="/contact?interest=Product%20Demonstration">Request a demo ↗</ButtonLink>
        <ButtonLink href="/schools" variant="light">For schools</ButtonLink>
      </PageHero>

      <InfoStrip items={[{ icon: "🪄", label: "Create" }, { icon: "📖", label: "Tell stories" }, { icon: "🧩", label: "Experiment" }, { icon: "🌟", label: "Share ideas" }]} />

      <Section>
        <Container>
          <SectionHeading eyebrow="Explore the experience" title={<>One creative journey.<br />Many possibilities.</>} description="Build confidence by learning through hands-on creative projects." />
          <FeatureGrid>
            <FeatureCard icon={<Icon name="layers" size={32} />} title="Animation creation" description="Explore frames, layers, movement and visual sequencing while making animated projects." href="/contact?interest=Animation%20and%20Storytelling" linkLabel="Ask about animation" />
            <FeatureCard icon={<Icon name="book" size={32} />} title="Visual storytelling" description="Turn concepts into scenes and stories that help learners express what they understand." href="/contact?interest=Animation%20and%20Storytelling" linkLabel="Explore storytelling" />
            <FeatureCard icon={<Icon name="bulb" size={32} />} title="Creative thinking" description="Encourage experimentation, problem-solving and original ideas through project-based learning." href="/contact" linkLabel="Talk to our team" />
          </FeatureGrid>
        </Container>
      </Section>

      <div id="storytelling">
        <SplitFeature eyebrow="Our learning philosophy" title="From passive viewing to active making." description="We believe technology becomes more meaningful when learners use it to create. JaaDeX encourages students to experiment, design, create and reflect on their work." art="🚀" artLabel="Start with an idea" points={["Learning activities built around creating", "Room for individual expression and teamwork", "Creative technology for classroom and independent exploration"]}>
          <ButtonLink href="/contact?interest=Product%20Demonstration" variant="dark">See how it works ↗</ButtonLink>
        </SplitFeature>
      </div>

      <CalloutBand title="Your next idea deserves a canvas." description="Talk with us about bringing JaaDeX creative learning into your school, institution or program."><ButtonLink href="/contact">Start a conversation →</ButtonLink></CalloutBand>
    </>
  );
}
