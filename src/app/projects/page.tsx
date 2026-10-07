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

export const metadata: Metadata = { title: "Projects", description: "Explore JaaDeX project areas across animation education, storytelling, original IP and creative technology." };

export default function ProjectsPage() {
  return (
    <>
      <PageHero eyebrow="JaaDeX projects" title={<>Ideas that can grow into <span>experiences.</span></>} description="JaaDeX explores projects that connect education, animation, storytelling and emerging creative technology. We work to turn concepts into useful learning experiences, original content and opportunities to collaborate." art="🧩">
        <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Propose a collaboration ↗</ButtonLink>
        <ButtonLink href="/events" variant="light">See events</ButtonLink>
      </PageHero>

      <Section>
        <Container>
          <SectionHeading eyebrow="Our project areas" title="Different ideas. One creative purpose." description="These are key areas of interest and development. Project scope, partners and delivery timelines are discussed individually." />
          <FeatureGrid>
            <FeatureCard icon={<Icon name="palette" size={32} />} title="JaaDeX Animate" description="A desktop animation learning experience designed to help students explore frames, layers, movement and visual storytelling." href="/schools" linkLabel="Explore school learning" />
            <FeatureCard icon={<Icon name="book" size={32} />} title="Animated learning content" description="Explore ways to turn educational concepts, classroom topics and learning activities into visual stories and animated explainers." href="/contact?interest=Animation%20and%20Storytelling" linkLabel="Discuss an idea" />
            <FeatureCard icon={<Icon name="clapperboard" size={32} />} title="AI filmmaking learning" description="Learning concepts and workflows that connect story development, visual planning, AI-assisted production and editing." href="/contact?interest=AI%20Filmmaking%20Courses" linkLabel="Ask about courses" />
            <FeatureCard icon={<Icon name="tree" size={32} />} title="Heritage-inspired storytelling" description="Explore how regional crafts, cultural knowledge and local stories can inspire animation and children's content." href="/contact?interest=Partnership%20or%20Collaboration" linkLabel="Discuss collaboration" />
            <FeatureCard icon={<Icon name="wand" size={32} />} title="Original characters & IP" description="Develop character concepts and story worlds with potential for educational content, short animation and longer-form storytelling." href="/contact?interest=Partnership%20or%20Collaboration" linkLabel="Explore IP collaboration" />
            <FeatureCard icon={<Icon name="monitor" size={32} />} title="Creative technology experiments" description="Explore tools and workflows that make digital creation more approachable for students, teachers and emerging creators." href="/contact" linkLabel="Talk to the team" />
          </FeatureGrid>
        </Container>
      </Section>

      <SplitFeature eyebrow="From concept to creation" title="A thoughtful path for every project." description="Good creative work starts with understanding the audience and purpose. We use a project-minded approach to shape the idea, identify the right collaborators and plan practical next steps." art="💡" artLabel="Build the idea" points={["Discover the audience, need and story opportunity", "Define scope, deliverables and creative direction", "Prototype, review and improve with feedback", "Discuss distribution, learning use and partnership needs"]}>
        <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration" variant="dark">Share your project idea ↗</ButtonLink>
      </SplitFeature>

      <Section topless>
        <Container>
          <ClosingCard title="Have a story, learning challenge or creative concept?" description="We welcome conversations with schools, creators, cultural organizations, studios and potential project partners.">
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Let&apos;s explore it ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
      <CalloutBand title="Let's create something meaningful." description="Share the idea you want to develop and the kind of collaboration you have in mind."><ButtonLink href="/contact">Start a project conversation →</ButtonLink></CalloutBand>
    </>
  );
}
