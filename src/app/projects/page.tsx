import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ButtonLink";
import { ClosingCard } from "@/components/ClosingCard";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { Icon } from "@/components/Icon";
import { KondapalliImage } from "@/components/projects/KondapalliImage";
import { PhotoSlider, type SlideItem } from "@/components/projects/PhotoSlider";
import { Section } from "@/components/Section";
import { SectionHeading } from "@/components/SectionHeading";
import { kondapalli, type Chapter, type Photo } from "@/data/projects/kondapalli";
import { assetExists } from "@/lib/projects/assets";

const SITE_URL = "https://www.jaadex.com";
const { seo, chapters, roadAhead, closing } = kondapalli;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: "/projects" },
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "article",
    url: `${SITE_URL}/projects`,
    images: [{ url: `${SITE_URL}${seo.ogImage}`, width: 1600, height: 900, alt: seo.ogAlt }],
  },
};

const visionPoints = [
  "Create original characters and stories",
  "Build a children's animation IP",
  "Introduce Kondapalli heritage to younger audiences",
  "Develop animated content and digital experiences",
  "Create opportunities for artists and creators",
  "Connect traditional craftsmanship with modern technology",
];

const approachSteps = ["Heritage", "Story", "Character", "Animation", "IP"];

function Figure({
  photo,
  size,
  sizes,
  cover = false,
  fixedHeight = false,
}: {
  photo: Photo;
  size: { width: number; height: number };
  sizes: string;
  cover?: boolean;
  fixedHeight?: boolean;
}) {
  const ratio = photo.ratio;
  const naturalWidth = cover && fixedHeight && ratio !== undefined;
  const frameClass = !cover
    ? "relative overflow-hidden rounded-3xl border border-line shadow-soft"
    : naturalWidth
      ? "relative h-100 overflow-hidden rounded-3xl"
      : `relative aspect-4/5 overflow-hidden rounded-3xl ${fixedHeight ? "w-80 max-w-full" : ""}`;
  const frameStyle = naturalWidth ? { width: `calc(25rem * ${ratio.w} / ${ratio.h})` } : undefined;

  return (
    <figure>
      <div className={frameClass} style={frameStyle}>
        {cover ? (
          <KondapalliImage src={photo.src} alt={photo.alt} fill sizes={sizes} eager={photo.eager} className="object-cover" />
        ) : (
          <KondapalliImage src={photo.src} alt={photo.alt} width={size.width} height={size.height} sizes={sizes} eager={photo.eager} />
        )}
      </div>
      <figcaption className="mt-3 text-center text-sm leading-snug font-bold text-navy">{photo.caption}</figcaption>
    </figure>
  );
}

function ChapterText({ chapter }: { chapter: Chapter }) {
  return (
    <>
      <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Chapter {chapter.number}</div>
      <h2 id={`chapter-${chapter.number}`} className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">
        {chapter.title}
      </h2>
      <span className="mb-5 block h-1 w-16 rounded-full bg-gradient-to-r from-royal via-sky to-orange" aria-hidden="true" />
      <p className="text-[15px] leading-[1.75] text-muted">{chapter.body}</p>
    </>
  );
}

// Text on one side, photo(s) on the other. Alternates sides on desktop, stacks on mobile.
function SideBySide({ chapter, reversed, media }: { chapter: Chapter; reversed: boolean; media: React.ReactNode }) {
  return (
    <Section>
      <Container>
        <div className="grid items-center gap-[25px] md:grid-cols-2 md:gap-[54px]">
          <div className={reversed ? "md:order-2" : ""}>
            <ChapterText chapter={chapter} />
          </div>
          <div className={`${reversed ? "md:order-1" : ""} ${chapter.compactMedia ? "mx-auto w-full max-w-[380px]" : ""}`}>{media}</div>
        </div>
      </Container>
    </Section>
  );
}

function ChapterSection({ chapter, index }: { chapter: Chapter; index: number }) {
  const reversed = index % 2 === 1;
  const [first] = chapter.photos;

  if (chapter.layout === "slider") {
    // Availability is checked here on the server and passed to the client slider.
    const slides: SlideItem[] = chapter.photos.map((photo) => ({ src: photo.src, alt: photo.alt, available: assetExists(photo.src) }));
    return (
      <SideBySide
        chapter={chapter}
        reversed={reversed}
        media={
          <PhotoSlider slides={slides} caption={first?.caption ?? ""} label={`Chapter ${chapter.number} photos`} />
        }
      />
    );
  }

  if (chapter.layout === "beside" && first) {
    const landscape = chapter.photoAspect === "landscape";
    return (
      <SideBySide
        chapter={chapter}
        reversed={reversed}
        media={
          <Figure
            photo={first}
            size={landscape ? { width: 1600, height: 900 } : { width: 800, height: 1000 }}
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        }
      />
    );
  }

  // grid: text first, then a centred row of photos underneath.
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-[760px]">
          <ChapterText chapter={chapter} />
        </div>
        <ul
          className={`mx-auto mt-8 justify-center ${
            chapter.fixedHeight ? "flex flex-wrap items-start gap-5" : "grid max-w-full grid-cols-[repeat(auto-fit,minmax(14rem,20rem))] gap-4 md:gap-5"
          }`}
        >
          {chapter.photos.map((photo) => (
            <li key={photo.src}>
              <Figure
                photo={photo}
                size={{ width: 800, height: 600 }}
                sizes="(min-width: 768px) 20rem, 14rem"
                cover={chapter.matchHeight}
                fixedHeight={chapter.fixedHeight}
              />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export default function ProjectsPage() {
  return (
    <>
      {/* Page banner */}
      <section className="bg-hero-wash py-[72px] md:py-[96px]">
        <Container className="mx-auto max-w-[820px] text-center">
          <Eyebrow>✦ JaaDeX Projects</Eyebrow>
          <h1 className="mx-auto my-5 max-w-[780px] font-display text-5xl leading-[1.02] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(40px,5vw,62px)]">
            Kondapalli: Stories Carved in Wood
          </h1>
          <p className="mx-auto mb-[28px] max-w-[680px] text-[16px] leading-[1.75] text-[#4a5a85]">
            JaaDeX develops creative technology projects that connect storytelling,
            animation, education, and cultural heritage.
          </p>
        </Container>
      </section>

      {/* Featured project — Kondapalli Animation IP */}
      <section className="py-[58px] md:py-[76px]">
        <Container className="grid items-center gap-[25px] md:grid-cols-[1.1fr_.9fr] md:gap-[54px]">
          <div className="relative overflow-hidden rounded-[32px] border border-line shadow-soft">
            <Image
              src="/assets/Colorful%20Figurines%20on%20Red%20Shelf.png"
              alt="Colorful Kondapalli wooden figurines displayed on a red shelf"
              width={900}
              height={900}
              className="h-auto w-full object-cover"
              priority
            />
            <div className="absolute top-[22px] left-5 z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">✦ Kondapalli IP</div>
            <div className="absolute right-[18px] bottom-[22px] z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">🌟 Every idea matters</div>
          </div>
          <div>
            <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">Featured Project</div>
            <h2 className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">Kondapalli Animation IP</h2>
            <p className="text-[15px] leading-[1.75] text-muted">From Traditional Wooden Toys to a New Storytelling Universe. Kondapalli Bommalu are more than traditional wooden toys. They represent the artistic heritage and cultural identity of Andhra Pradesh. JaaDeX is exploring how these iconic characters can be transformed into a new generation of animated stories and children&apos;s entertainment.</p>
            <ul className="my-[23px] grid gap-[13px]">
              {visionPoints.slice(0, 4).map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm font-extrabold text-[#2f3f7a]">
                  <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#dce8ff] text-royal"><Icon name="check" size={14} /></span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/contact" variant="dark">Explore the Kondapalli IP ↗</ButtonLink>
          </div>
        </Container>
      </section>

      {/* Chapters 01–08 */}
      {chapters.map((chapter, index) => (
        <ChapterSection key={chapter.number} chapter={chapter} index={index} />
      ))}

      {/* The Road Ahead — light section, text only */}
      <Section>
        <Container>
          <SectionHeading eyebrow={roadAhead.label} title={roadAhead.title} />
          <div className="relative">
            <span className="absolute top-7 right-[12%] left-[12%] hidden h-1 rounded-full bg-gradient-to-r from-[#1450d6] via-[#18a8ee] to-[#f4690d] opacity-30 lg:block" aria-hidden="true" />
            <ol className="relative grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {roadAhead.steps.map((step) => (
                <li key={step.number} className="rounded-[25px] border border-line bg-paper p-6 shadow-soft">
                  <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#1450d6] via-[#18a8ee] to-[#f4690d] font-display text-lg font-black text-white shadow-[0_0_0_5px_rgb(255_255_255),0_8px_20px_rgb(20_80_214/0.3)]" aria-hidden="true">
                    {step.number}
                  </span>
                  <h3 className="mt-5 font-display text-[19px] leading-snug font-bold text-navy">
                    <span className="sr-only">Step {step.number}: </span>
                    {step.title}
                  </h3>
                </li>
              ))}
            </ol>
          </div>
          <p className="mx-auto mt-10 w-fit rounded-full bg-[#e2ebff] px-6 py-2.5 text-center font-display text-base font-black text-royal md:text-lg">{roadAhead.tagline}</p>
        </Container>
      </Section>

      {/* Our Vision checklist */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Our Vision" title="Where the Kondapalli IP can go." description="Six directions guiding how traditional craftsmanship meets modern storytelling and technology." />
          <ul className="mx-auto grid max-w-[980px] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {visionPoints.map((point, index) => (
              <li key={point} className="flex items-center gap-3 rounded-[18px] border border-line bg-paper px-4 py-[15px]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[#e2ebff] text-[14px] font-black text-royal" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[14px] leading-[1.45] font-bold text-navy">{point}</span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Our Approach — horizontal timeline */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Our Approach" title="How We Bring the Bommalu to Life" description="From the artisans' workshops to the screen: each step turns a cultural idea into a digital experience." />
          <ol className="relative mx-auto grid max-w-[1000px] list-none grid-cols-1 gap-5 p-0 md:grid-cols-5 md:gap-3" aria-label="Our approach: heritage, story, character, animation and IP">
            <span className="absolute top-6 right-[10%] left-[10%] hidden h-1 rounded-full bg-gradient-to-r from-[#1450d6] via-[#18a8ee] to-[#f4690d] opacity-30 md:block" aria-hidden="true" />
            {approachSteps.map((step, index) => (
              <li key={step} className="relative flex flex-col items-center text-center">
                <span className="z-10 grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#1450d6] via-[#18a8ee] to-[#f4690d] text-[13px] font-black text-white shadow-[0_0_0_5px_rgb(255_255_255),0_8px_20px_rgb(20_80_214/0.3)]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-3 hidden h-6 w-1 rounded-full bg-gradient-to-b from-[#18a8ee] to-[#f4690d] opacity-50 md:block" aria-hidden="true" />
                <h3 className="mt-2 font-display text-[16px] font-bold text-navy">{step}</h3>
                {index < approachSteps.length - 1 ? (
                  <span className="mt-2 text-[18px] font-black text-orange md:hidden" aria-hidden="true">↓</span>
                ) : null}
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section topless>
        <Container>
          <ClosingCard title="Have a Kondapalli story to tell?" description="We welcome conversations with schools, creators, cultural organizations, studios and potential project partners about the Kondapalli IP and beyond.">
            <ButtonLink href="/contact">Explore the Kondapalli IP ↗</ButtonLink>
          </ClosingCard>
        </Container>
      </Section>

      {/* Story closing: quote, logos, credits */}
      <Section>
        <Container className="text-center">
          <figure className="mx-auto max-w-205">
            <blockquote>
              <p className="font-display text-[clamp(24px,3.4vw,38px)] leading-tight font-black tracking-[-1px] text-navy">
                &ldquo;{closing.quote}&rdquo;
              </p>
            </blockquote>
          </figure>

          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-10 md:gap-14">
            <KondapalliImage src={closing.logos.jaadex.src} alt={closing.logos.jaadex.alt} width={465} height={145} className="h-16 w-auto" />
            <KondapalliImage src={closing.logos.society.src} alt={closing.logos.society.alt} width={378} height={192} className="h-24 w-auto" />
          </div>

          <div className="mx-auto mt-10 max-w-180 space-y-2 text-sm leading-[1.7] text-muted">
            {closing.credits.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <a
                href={closing.website.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-royal underline underline-offset-4 hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                {closing.website.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
