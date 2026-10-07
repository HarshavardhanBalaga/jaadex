import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { InfoStrip } from "@/components/InfoStrip";
import { PageHero } from "@/components/PageHero";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { StepGrid } from "@/components/StepGrid";

export const metadata: Metadata = { title: "Events", description: "JaaDeX workshops, creative learning events, animation sessions and collaboration opportunities." };

const steps = [
  { title: "Welcome & inspiration", description: "Introduce the theme, audience goals and examples of creative work." },
  { title: "Learn the process", description: "Explore the foundations of animation, storytelling or the selected workshop topic." },
  { title: "Hands-on activity", description: "Give participants time to experiment, collaborate and develop a small creative output." },
  { title: "Showcase & next steps", description: "Share reflections, discuss opportunities and gather feedback for future learning." },
];

export default function EventsPage() {
  return (
    <>
      <PageHero eyebrow="JaaDeX events & workshops" title={<>Learn together. Create <span>what&apos;s next.</span></>} description="JaaDeX events bring students, educators, storytellers and creative professionals together to explore animation, digital creation, AI filmmaking and creative industries." art="🎤">
        <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Discuss an event ↗</ButtonLink>
        <ButtonLink href="/contact" variant="light">Invite JaaDeX</ButtonLink>
      </PageHero>

      <InfoStrip items={[{ icon: "🎓", label: "Student learning" }, { icon: "🧑‍🏫", label: "Educator sessions" }, { icon: "🎬", label: "Creative workshops" }, { icon: "🤝", label: "Industry connections" }]} />

      <Section>
        <Container>
          <SectionHeading eyebrow="What we can explore" title="Events built around making and sharing." description="Formats can be adapted to the audience, time available, venue and learning objectives." />
          <FeatureGrid>
            <FeatureCard icon={<Icon name="graduation" size={32} />} title="School workshops" description="Interactive sessions introducing animation, story structure and creative classroom activities." />
            <FeatureCard icon={<Icon name="presentation" size={32} />} title="Educator orientation" description="Practical discussions and demonstrations to help teachers explore creative tools and learning workflows." />
            <FeatureCard icon={<Icon name="film" size={32} />} title="AI filmmaking sessions" description="Explore story ideation, visual planning and responsible use of AI tools in a filmmaking workflow." />
            <FeatureCard icon={<Icon name="users" size={32} />} title="Creative community meetups" description="Bring students, artists, creators, institutions and industry voices together to exchange ideas." />
            <FeatureCard icon={<Icon name="calendar" size={32} />} title="Talks & showcases" description="Share creative work, discuss new opportunities and highlight student or community projects." />
            <FeatureCard icon={<Icon name="handshake" size={32} />} title="Partner-led programs" description="Collaborate with schools, organizations and sponsors to shape events around shared goals." />
          </FeatureGrid>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <SectionHeading eyebrow="Example workshop flow" title="A practical event experience." description="A sample structure that can be tailored for a half-day or full-day program." />
          <StepGrid steps={steps} />
        </Container>
      </Section>

      <Section>
        <Container>
          <ClosingCard title="Planning a school event, workshop or creative industry program?" description="Tell us your audience, proposed date, venue, objectives and the type of support you need. Event dates and participation are confirmed individually.">
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration">Plan an event with us ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
      <CalloutBand title="Let's bring people together through creativity." description="Explore a workshop, learning session, showcase or partnership program with JaaDeX."><ButtonLink href="/contact">Send an event enquiry →</ButtonLink></CalloutBand>
    </>
  );
}
