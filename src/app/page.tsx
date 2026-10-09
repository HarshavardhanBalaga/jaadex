import Image from "next/image";
import { Icon } from "@/components/Icon";
import { Hero } from "@/components/Hero";
import { ButtonLink } from "@/components/ButtonLink";
import { CalloutBand } from "@/components/CalloutBand";
import { Container } from "@/components/Container";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CourseCard } from "@/components/CourseCard";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureGrid } from "@/components/FeatureGrid";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { SplitFeature } from "@/components/SplitFeature";

const faqs = [
  { question: "What is JaaDeX?", answer: "JaaDeX Innovision is building a creative learning platform that brings together animation, storytelling, school education and emerging creative technologies." },
  { question: "What can schools explore with JaaDeX?", answer: "Schools can enquire about JaaDeX Animate, classroom animation activities, curriculum support, teacher onboarding and implementation planning." },
  { question: "What kinds of projects does JaaDeX work on?", answer: "JaaDeX explores educational animation, digital storytelling, original intellectual property, heritage-inspired stories and AI-assisted creative learning." },
  { question: "Can we collaborate or host a workshop with JaaDeX?", answer: "Yes. Schools, educational institutions, creative professionals and potential partners can contact the team to discuss events, training, sponsorship or project collaborations." },
];

export default function HomePage() {
  return (
    <>
      <Hero
        title={
          <>
            Little Ideas<span className="block text-orange">Big Creations.</span>
          </>
        }
        description="Animation, storytelling and creative tech that help young learners imagine more and make more."
        cta={{ label: "Book a Demo ↗", href: "/contact?interest=Product%20Demonstration" }}
      />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Discover JaaDeX"
            title={
              <>
                More than learning.
                <br />
                It&apos;s learning by creating.
              </>
            }
            description="From a first animated lesson to an AI-assisted film idea, JaaDeX gives learners room to explore, experiment and express themselves."
          />
          <FeatureGrid columns={4}>
            <FeatureCard tone="blue" icon={<Icon name="wand" size={32} />} title="JaaDeX Animate" description="Bring drawings, ideas and classroom concepts to life with a hands-on animation experience." href="/schools" linkLabel="Explore animation" />
            <FeatureCard tone="peach" icon={<Icon name="book" size={32} />} title="Storytelling Studio" description="Build characters, shape stories and turn imagination into meaningful visual narratives." href="/platform#storytelling" linkLabel="Find your story" />
            <FeatureCard tone="lilac" icon={<Icon name="sparkles" size={32} />} title="AI Creative Learning" description="Discover thoughtful ways to use emerging AI tools for ideas, visuals and creative projects." href="/platform" linkLabel="Explore AI learning" />
            <FeatureCard tone="mint" icon={<Icon name="clapperboard" size={32} />} title="AI Filmmaking" description="Learn the creative journey from concept and script to scenes, video and a finished film." href="/ai-filmmaking" linkLabel="View learning paths" />
          </FeatureGrid>
        </Container>
      </Section>
{/* 
      <SplitFeature eyebrow="Our purpose" title="Help learners become creators, not just viewers." description="JaaDeX is building approachable creative learning experiences where students can explore ideas, make animated explanations, develop stories and share what they have learned." art="🧑🏽‍💻" artLabel="Learn by creating" points={["Hands-on animation and storytelling activities", "Creative technology connected to learning goals", "Support for educators and institutions"]}>
        <ButtonLink href="/about" variant="dark">Get to know JaaDeX ↗</ButtonLink>
      </SplitFeature> */}
{/* 
      <section className="relative overflow-hidden bg-[#0c35a0]/90 py-[60px] text-white">
        <Container className="grid items-center gap-7 md:grid-cols-[1.25fr_.75fr]">
          <div>
            <h2 className="mb-3 font-display text-[clamp(29px,4vw,43px)] leading-[1.1] font-black tracking-[-1.4px]">
              Every creator starts with a spark.
              <Image
                src="/assets/spark-svgrepo-com.svg"
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="ml-3 inline-block size-9 align-[-6px] brightness-0 invert md:size-10"
              />
            </h2>
            <p className="max-w-[680px] leading-[1.7] text-[#d6e2ff]">
              We believe creativity isn&apos;t just an extra subject — it&apos;s a way to learn, communicate and imagine new possibilities. JaaDeX brings
              technology and storytelling together so learners can become makers, not just viewers.
            </p>
          </div>
          <div className="flex flex-wrap gap-[11px] md:justify-end max-md:mt-1.5">
            <ButtonLink href="/platform">Discover our platform →</ButtonLink>
            <ButtonLink href="/contact?interest=Partnership%20or%20Collaboration" variant="light">Partner with JaaDeX</ButtonLink>
          </div>
        </Container>
      </section> */}

      <Section>
        <Container>
          <SectionHeading eyebrow="Creative learning paths" title="Find your next big idea." description="Flexible learning experiences for young creators, educators and aspiring filmmakers. Start with curiosity and grow your creative skills step by step." />
          <FeatureGrid>
            <CourseCard
              tone="peach"
              imageSrc="/assets/animation.webp"
              imageAlt="Animation Foundations — colourful illustrated frames"
              meta="For students"
              pill="Create"
              title="Animation Foundations"
              description="Explore frames, movement, visual storytelling and the joy of making your own animation."
              footerNote="Learn through projects"
              footerIcon={<Icon name="puzzle" size={15} />}
              href="/contact?interest=Animation%20Foundations"
              linkLabel="Enquire →"
            />
            <CourseCard
              tone="mint"
              imageSrc="/assets/story-screen.jpeg"
              imageAlt="Story to Screen — storyboards and visual planning"
              meta="For storytellers"
              pill="Imagine"
              title="Story to Screen"
              description="Shape an idea into a story with characters, scenes, storyboards and a clear creative vision."
              footerNote="Build your story"
              footerIcon={<Icon name="pencil" size={15} />}
              href="/contact?interest=Story%20to%20Screen"
              linkLabel="Enquire →"
            />
            <CourseCard
              tone="lilac"
              imageSrc="/assets/ai-filmmaking.jpg"
              imageAlt="AI Filmmaking Studio — cinema-style creative workflow"
              meta="For future creators"
              pill="Explore AI"
              title="AI Filmmaking Studio"
              description="Explore AI-assisted ideation, script development, visual creation, video workflows and editing."
              footerNote="Idea to film"
              footerIcon={<Icon name="clapperboard" size={15} />}
              href="/contact?interest=AI%20Filmmaking%20Studio"
              linkLabel="Enquire →"
            />
          </FeatureGrid>
        </Container>
      </Section>


      <Section id="faq">
        <Container className="max-w-[900px]">
          <SectionHeading eyebrow="Good questions" title="Get to know JaaDeX" description="A few quick answers about our platform, school work, projects and events." />
          <FaqAccordion items={faqs} />
        </Container>
      </Section>

      <Section topless>
        <Container>
          <div className="relative grid items-center gap-7 overflow-hidden rounded-[28px] bg-midnight px-7 py-10 text-white md:grid-cols-[1.4fr_.6fr] md:px-12 md:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-royal/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-orange/25 blur-3xl" />
            <div className="relative">
              <h2 className="mb-3 font-display text-[clamp(27px,3.6vw,40px)] leading-[1.12] font-black tracking-[-1.2px]">
                Ready to turn &ldquo;what if?&rdquo; into &ldquo;look what I made!&rdquo;
              </h2>
              <p className="max-w-[620px] leading-[1.7] text-[#d6e2ff]">
                Bring JaaDeX into your classroom, explore a creative learning path or start a conversation about collaboration.
              </p>
            </div>
            <div className="relative flex md:justify-end">
              <ButtonLink href="/contact">Let&apos;s create together ↗</ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
