import Image from "next/image";
import { ButtonLink } from "./ButtonLink";
import { ClosingCard } from "./ClosingCard";
import { Container } from "./Container";
import { FeatureCard } from "./FeatureCard";
import { FeatureGrid } from "./FeatureGrid";
import { Icon } from "./Icon";
import { Section } from "./Section";
import { SchoolRows } from "./SchoolRows";
import { SectionHeading } from "./SectionHeading";

const demoHref = "/contact?interest=Product%20Demonstration";

/** Demo page: try JaaDeX, get a free demo and see what learners can do. */
export function Demo() {
  return (
    <>
      <section className="flex min-h-[90vh] flex-col justify-center py-[50px] md:pt-[54px]">
        <Container className="grid items-center gap-[25px] md:grid-cols-[1.15fr_.85fr] md:gap-[35px]">
          <div>
            <h1 className="mb-5 font-display text-5xl leading-[.99] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(39px,5vw,60px)] md:tracking-[-2.6px]">
              Try JaaDeX <span className="block text-orange">with a demo.</span>
            </h1>
            <p className="mb-3 max-w-[640px] leading-[1.75] text-[#4a5a85]">
              See how JaaDeX can turn ideas into interactive experiences that make learning more visual, engaging and fun.
            </p>
            <p className="mb-[25px] max-w-[640px] leading-[1.75] text-[#4a5a85]">
              Explore a demo experience and get a feel for how JaaDeX brings concepts to life through stories, animation and interaction.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={demoHref}>Try JaaDeX</ButtonLink>
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

      <SchoolRows />

      <Section>
        <Container>
          <SectionHeading eyebrow="Experiences" title="What can you experience?" />
          <FeatureGrid columns={4}>
            <FeatureCard tone="blue" icon={<Icon name="book" size={32} />} title="Learn through stories" description="Ideas become easier to understand when they are connected to characters, situations and stories." />
            <FeatureCard tone="peach" icon={<Icon name="bulb" size={32} />} title="See ideas come to life" description="Animation makes abstract concepts visual, helping learners understand not just what something is, but how it works." />
            <FeatureCard tone="lilac" icon={<Icon name="puzzle" size={32} />} title="Explore and interact" description="JaaDeX is designed to make learners active participants rather than passive viewers." />
            <FeatureCard tone="mint" icon={<Icon name="pencil" size={32} />} title="Create your own" description="Learning doesn't stop at understanding. JaaDeX encourages young learners to experiment, imagine and create." />
          </FeatureGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <ClosingCard title="See it for yourself." description="The best way to understand JaaDeX is to experience it. Explore the demo and discover a different way of learning.">
            <ButtonLink href={demoHref}>Start Exploring →</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <div className="relative overflow-hidden rounded-[28px] bg-midnight px-7 py-10 text-center text-white md:px-12 md:py-14">
            <h2 className="mx-auto mb-4 max-w-[640px] font-display text-[clamp(27px,3.6vw,40px)] leading-[1.12] font-black tracking-[-1.2px]">
              Learning should be more than watching. It should make you curious.
            </h2>
            <p className="font-display text-lg font-black text-gold">JaaDeX</p>
            <p className="mt-1 text-[#d6e2ff]">Animation. Storytelling. Creative technology.</p>
          </div>
        </Container>
      </Section>
    </>
  );
}
