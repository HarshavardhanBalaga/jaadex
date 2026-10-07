import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SplitFeature } from "@/components/SplitFeature";

export const metadata: Metadata = { title: "About JaaDeX", description: "Learn about JaaDeX Innovision, our purpose, values and creative learning mission." };

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About JaaDeX Innovision" title={<>Growing a generation of <span>creative thinkers.</span></>} description="JaaDeX Innovision Pvt Ltd is a creative technology company working at the intersection of education, animation, storytelling and digital creation. Our goal is to make creative tools and learning experiences more approachable for students and educators." art="🌱">
        <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Connect with JaaDeX ↗</ButtonLink>
      </PageHero>

      <Section>
        <Container>
          <SectionHeading eyebrow="Who we are" title="Technology with imagination at its heart." description="We see creativity as more than an extra activity. It can help learners communicate what they understand, experiment with ideas and build confidence by making something of their own." />
          <FeatureGrid>
            <FeatureCard icon={<Icon name="target" size={32} />} title="Our mission" description="Make animation, storytelling and digital creation accessible learning experiences for students, educators and emerging creators." />
            <FeatureCard icon={<Icon name="bulb" size={32} />} title="Our vision" description="Help nurture a creative ecosystem where learning, original ideas and technology come together to open new possibilities." />
            <FeatureCard icon={<Icon name="heart" size={32} />} title="Our approach" description="Start with curiosity, learn by doing, encourage experimentation and keep people at the centre of every creative experience." />
          </FeatureGrid>
        </Container>
      </Section>

      <SplitFeature eyebrow="What we believe" title="Every learner has an idea worth exploring." description="A student may explain a science concept through animation, turn a local story into a visual narrative or discover filmmaking through a guided creative project. JaaDeX wants to help make these experiences possible." art="🌈" artLabel="Ideas grow here" points={["Learning can be active, visual and hands-on", "Students should have opportunities to create and express", "Educators deserve practical support when introducing new tools", "Creative technology should be used thoughtfully and responsibly"]}>
        <ButtonLink href="/schools" variant="dark">Explore school solutions ↗</ButtonLink>
      </SplitFeature>

      <Section>
        <Container>
          <SectionHeading eyebrow="Our values" title="The principles behind our work." />
          <FeatureGrid columns={4}>
            <FeatureCard icon={<Icon name="bulb" size={32} />} title="Curiosity" description="Ask questions, explore different directions and stay open to new ideas." />
            <FeatureCard icon={<Icon name="puzzle" size={32} />} title="Experimentation" description="Learn through making, testing, refining and trying again." />
            <FeatureCard icon={<Icon name="users" size={32} />} title="Collaboration" description="Bring students, teachers, creators and institutions into shared learning experiences." />
            <FeatureCard icon={<Icon name="sprout" size={32} />} title="Growth" description="Build skills step by step and celebrate progress as well as finished work." />
          </FeatureGrid>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="We are building with educators, creators and communities." description="We welcome conversations about school learning, creative projects, workshops and partnerships.">
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Explore collaboration ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
      <CalloutBand title="Let's make creative learning more accessible." description="Share your idea, challenge or partnership opportunity with the JaaDeX team."><ButtonLink href="/contact">Contact us →</ButtonLink></CalloutBand>
    </>
  );
}
