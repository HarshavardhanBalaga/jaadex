import Image from "next/image";
import { Container } from "./Container";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const rows = [
  {
    eyebrow: "Works offline",
    title: "Create anytime, anywhere.",
    description: "Runs on the computers your school already has. No new hardware needed.",
    tag: "No new hardware",
    image: "/assets/workshop-classroom.jpg",
    alt: "Students working at classroom computers",
  },
  {
    eyebrow: "Trained teachers",
    title: "Teachers ready fast. Students creating from day one.",
    description: "Quick, easy training so teachers can guide students with confidence.",
    tag: "2 sessions a week",
    image: "/assets/workshop-collab.jpg",
    alt: "Students and a teacher collaborating on a project",
  },
  {
    eyebrow: "Engaged students",
    title: "Stronger understanding, creativity and confidence.",
    description: "Active learning through creation and fun, with better outcomes for every learner.",
    tag: "Better outcomes",
    image: "/assets/animation.webp",
    alt: "Colourful animated frames made by students",
  },
  {
    eyebrow: "Safe and simple",
    title: "Kid-safe, curriculum aligned and quick to start.",
    description: "Easy onboarding gets your school started straight away, in a safe space that supports your goals.",
    tag: "Curriculum aligned",
    image: "/assets/story-screen.jpeg",
    alt: "Storyboards planned for a student animation",
  },
];

/** How JaaDeX Animate works in schools: alternating image and text rows. */
export function SchoolRows() {
  return (
    <Section id="how-it-works">
      <Container>
        <SectionHeading eyebrow="JaaDeX Animate" title="How it works in schools" />
        <div className="grid gap-[60px] md:gap-[76px]">
          {rows.map((row, index) => {
            const imageRight = index % 2 === 0;
            return (
              <div key={row.title} className="grid items-center gap-[25px] md:grid-cols-2 md:gap-[54px]">
                <div className={`relative aspect-[4/3] overflow-hidden rounded-[32px] ${imageRight ? "md:order-2" : ""}`}>
                  <Image src={row.image} alt={row.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">{row.eyebrow}</div>
                  <h3 className="my-3 font-display text-[clamp(27px,3.4vw,38px)] leading-[1.1] font-black tracking-[-1.2px] text-navy">{row.title}</h3>
                  <p className="text-[15px] leading-[1.75] text-muted">{row.description}</p>
                  <span className="mt-5 inline-flex rounded-full bg-[#dce8ff] px-4 py-2 text-[13px] font-black text-royal">{row.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
