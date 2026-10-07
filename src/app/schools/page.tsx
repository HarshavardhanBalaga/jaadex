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
import { SplitFeature } from "@/components/SplitFeature";
import { StepGrid } from "@/components/StepGrid";

export const metadata: Metadata = { title: "Schools", description: "Detailed JaaDeX school solutions for animation software, curriculum activities, teacher onboarding and implementation." };

const steps = [
  { title: "Understand your school", description: "Discuss student age groups, learning goals, devices, timetable and current creative activities." },
  { title: "Demonstrate the workflow", description: "Explore the animation experience and identify suitable first projects for your learners." },
  { title: "Prepare educators", description: "Plan teacher orientation, activity guidance and classroom readiness before rollout." },
  { title: "Start and improve", description: "Begin with a manageable pilot, gather feedback and discuss how to expand the program." },
];

export default function SchoolsPage() {
  return (
    <>
      <PageHero eyebrow="JaaDeX for schools" title={<>Bring classroom ideas <span>to life.</span></>} description="Help students learn by creating. JaaDeX school solutions bring animation software, creative activities, teacher onboarding and implementation planning together in one coordinated approach." art="🏫">
        <ButtonLink href="/contact?interest=School%20Packages">Discuss a school package ↗</ButtonLink>
        <ButtonLink href="/contact?interest=Product%20Demonstration" variant="light">Request a demo</ButtonLink>
      </PageHero>

      <InfoStrip items={[{ icon: "💻", label: "Animation software" }, { icon: "📘", label: "Learning activities" }, { icon: "👩‍🏫", label: "Teacher onboarding" }, { icon: "🛠️", label: "Implementation support" }]} />

      <Section>
        <Container>
          <SectionHeading eyebrow="A coordinated school solution" title="Support beyond the software." description="Every school has its own timetable, curriculum priorities and digital readiness. JaaDeX can discuss a practical approach based on your students, teachers and available resources." />
          <FeatureGrid columns={4}>
            <FeatureCard icon={<Icon name="laptop" size={32} />} title="1. Animation software" description="Introduce students to animation concepts such as frames, layers, sequencing and movement through guided creation." />
            <FeatureCard icon={<Icon name="book" size={32} />} title="2. Curriculum activities" description="Plan visual learning activities that connect animation with classroom subjects, explanations and storytelling." />
            <FeatureCard icon={<Icon name="users" size={32} />} title="3. Teacher onboarding" description="Help teachers understand the workflow and prepare to guide students through creative projects." />
            <FeatureCard icon={<Icon name="wrench" size={32} />} title="4. Implementation support" description="Discuss setup, onboarding, classroom rollout and technical support requirements for your institution." />
          </FeatureGrid>
        </Container>
      </Section>

      <SplitFeature eyebrow="Learning outcomes" title="Let students show what they know." description="Animation gives learners another way to explain an idea, retell a story or communicate a process. Students can plan, create, review and present work while teachers connect the activity to lesson objectives." art="🧑🏽‍🎓" artLabel="Student creativity" points={["Visual communication and storytelling", "Creative thinking and problem-solving", "Project planning and sequencing", "Opportunities for collaboration and presentation"]}>
        <ButtonLink href="/contact?interest=School%20Packages" variant="dark">Plan a school discussion ↗</ButtonLink>
      </SplitFeature>

      <Section>
        <Container>
          <SectionHeading eyebrow="How onboarding can work" title="A clear path from enquiry to classroom." description="A suggested starting process. The exact scope, timelines and deliverables can be agreed with each school." />
          <StepGrid steps={steps} />
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Looking for a creative learning program for your school?" description="Tell us your grade levels, number of students and goals. We can discuss a suitable scope and next steps.">
            <ButtonLink href="/contact?interest=School%20Packages">Enquire about school packages ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>
      <CalloutBand title="Let's make learning more hands-on." description="Talk to JaaDeX about animation, classroom activities and implementation for your school."><ButtonLink href="/contact">Contact the team →</ButtonLink></CalloutBand>
    </>
  );
}
