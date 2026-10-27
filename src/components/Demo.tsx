import Image from "next/image";
import { ButtonLink } from "./ButtonLink";
import { ClosingCard } from "./ClosingCard";
import { Container } from "./Container";
import { FeatureCard } from "./FeatureCard";
import { FeatureGrid } from "./FeatureGrid";
import { Icon } from "./Icon";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const demoHref = "/contact";

const howItWorksSteps = [
  {
    title: "Ready for Your School",
    description:
      "JaaDeX Animate is designed to work on compatible school computers, making it easier to introduce animation and creative learning without necessarily investing in new hardware.",
  },
  {
    title: "Simple for Teachers",
    description: "Our guided training helps teachers learn the platform and confidently conduct creative classroom activities.",
  },
  {
    title: "Students Learn by Creating",
    description: "Students draw, design characters, build scenes, create animations, and develop their own stories through practical activities.",
  },
  {
    title: "Creativity Meets Learning",
    description: "Encourage visual understanding, creative thinking, storytelling, problem-solving, and confidence through active participation.",
  },
  {
    title: "Designed for Young Learners",
    description: "A child-friendly interface and structured learning activities help students explore animation in an accessible and engaging environment.",
  },
];

/** Demo page: try JaaDeX, get a free demo and see what learners can do. */
export function Demo() {
  return (
    <>
      <section className="flex min-h-[90vh] flex-col justify-center py-[50px] md:pt-[54px]">
        <Container className="grid items-center gap-[25px] md:grid-cols-[1.15fr_.85fr] md:gap-[35px]">
          <div>
            <h1 className="mb-5 font-display text-5xl leading-[.99] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(39px,5vw,60px)] md:tracking-[-2.6px]">
              Try JaaDeX with a <span className="block text-orange">Free Demo</span>
            </h1>
            <p className="mb-3 max-w-[640px] leading-[1.75] font-semibold text-navy">
              Turn ideas into stories. Turn stories into animation. Turn learning into creativity.
            </p>
            <p className="mb-[25px] max-w-[640px] leading-[1.75] text-[#4a5a85]">
              Discover how JaaDeX Animate transforms the way children learn by combining animation, storytelling, drawing, and interactive creativity.
              Explore our demo experiences and see how students can move beyond watching content to creating their own animated stories.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={demoHref}>Explore the Free Demo →</ButtonLink>
              <ButtonLink href="#how-it-works" variant="light">How JaaDeX Works</ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] md:aspect-auto md:h-[320px]">
            <Image
              src="/assets/workshop-students.jpg"
              alt="Students working on creative drawing activities in a classroom"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <Section topless>
        <Container>
          <div className="mx-auto max-w-[760px] text-center">
            <SectionHeading eyebrow="Discover How JaaDeX Works" title="Experience Learning Through Animation" />
            <div className="space-y-4 text-[15px] leading-[1.75] text-muted">
              <p>
                JaaDeX Animate is a creative learning platform that helps students understand concepts through visual storytelling, animation, and
                hands-on activities.
              </p>
              <p>
                From exploring ideas to creating original animated stories, students learn by doing, experimenting, and expressing themselves
                creatively.
              </p>
            </div>
            <p className="mt-6 font-display text-[19px] font-black text-orange">Give students the tools to imagine, create, and share.</p>
          </div>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <div className="grid items-center gap-[30px] rounded-[32px] bg-linear-[120deg,#dce8ff,#ffe6d3] px-6 py-10 md:grid-cols-2 md:gap-[35px] md:px-[43px] md:py-[50px]">
            <div className="text-center">
              <h2 className="mb-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">
                How about a free demo?
              </h2>
              <p className="mx-auto max-w-[520px] text-[15px] leading-[1.75] text-[#5a6a94]">
                Click the link below to get a taste of JaaDeX and see how learning comes to life through animation, storytelling and creative technology. We’ve created a few interactive experiences for you to explore and play with, so you can see for yourself how engaging learning can be.
              </p>
              <div className="mt-7 flex justify-center">
                <ButtonLink href={demoHref}>Get your free demo →</ButtonLink>
              </div>
            </div>
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[446px] overflow-hidden rounded-[24px]">
              <Image
                src="/assets/free-demo.jpg"
                alt="Children drawing and creating art together in a classroom"
                fill
                sizes="(min-width: 768px) 446px, 80vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section id="how-it-works">
        <Container>
          <SectionHeading eyebrow="How it works" title="How JaaDeX Animate Works in Schools" />
          <ol className="grid gap-[17px] md:grid-cols-2">
            {howItWorksSteps.map((step, index) => (
              <li key={step.title} className="flex gap-5 rounded-[25px] border border-line bg-white px-[21px] py-6 shadow-soft">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#dce8ff] font-display text-[18px] font-black text-royal">
                  {index + 1}
                </span>
                <div>
                  <h3 className="mb-2 font-display text-[19px] font-black text-navy">{step.title}</h3>
                  <p className="text-[15px] leading-[1.75] text-muted">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="Experiences" title="What Can Students Experience?" />
          <FeatureGrid columns={4}>
            <FeatureCard tone="blue" icon={<Icon name="book" size={32} />} title="Learn Through Stories" description="Connect concepts with characters, situations, and stories that make learning meaningful and memorable." />
            <FeatureCard tone="peach" icon={<Icon name="bulb" size={32} />} title="Bring Ideas to Life" description="Transform drawings and imagination into animated scenes and visual explanations." />
            <FeatureCard tone="lilac" icon={<Icon name="puzzle" size={32} />} title="Explore and Interact" description="Encourage students to experiment with creative tools and actively participate in the learning process." />
            <FeatureCard tone="mint" icon={<Icon name="pencil" size={32} />} title="Create Original Animations" description="Give students the opportunity to develop their own characters, design scenes, build stories, and express their ideas through animation." />
          </FeatureGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <ClosingCard
            title="See the Difference for Yourself"
            description="Reading about JaaDeX is just the beginning. Experience how animation and storytelling can make learning more creative, visual, and engaging. Explore our demo activities and discover new possibilities for your classroom."
          >
            <ButtonLink href={demoHref}>Start Exploring the Demo →</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <div className="relative overflow-hidden rounded-[28px] bg-midnight px-7 py-10 text-center text-white md:px-12 md:py-14">
            <h2 className="mx-auto mb-4 max-w-[640px] font-display text-[clamp(27px,3.6vw,40px)] leading-[1.12] font-black tracking-[-1.2px]">
              Learning Should Be More Than Watching
            </h2>
            <p className="mx-auto max-w-[640px] text-[#d6e2ff]">It should inspire curiosity, imagination, and creation.</p>
            <p className="mx-auto mt-3 max-w-[640px] text-[#d6e2ff]">
              JaaDeX Animate empowers students to become creators—not just consumers—of digital content.
            </p>
            <p className="mt-6 font-display text-lg font-black text-gold">Imagine. Create. Animate. Share.</p>
          </div>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <div className="grid gap-6 rounded-[28px] border border-line bg-white p-7 md:grid-cols-[1.1fr_.9fr] md:p-10">
            <div>
              <p className="font-display text-[22px] font-black text-navy">JaaDeX Innovision Pvt. Ltd.</p>
              <p className="mt-1 text-[14px] font-semibold text-orange">Animation. Storytelling. Creative Technology.</p>
              <p className="mt-5 font-display text-[18px] font-black text-navy">Try JaaDeX. Experience creative learning.</p>
            </div>
            <ul className="grid content-start gap-3 text-[15px] text-navy">
              <li>
                <a href="https://www.jaadex.com" className="font-semibold hover:text-royal">
                  Website: www.jaadex.com
                </a>
              </li>
              <li>
                <a href="mailto:info@jaadex.com" className="font-semibold hover:text-royal">
                  Email: info@jaadex.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/916304364546" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-royal">
                  WhatsApp: +91 63043 64546
                </a>
              </li>
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
