import type { ReactNode } from "react";
import { Container } from "./Container";
import { Section } from "./Section";

export type LegalSection = { heading: string; body: ReactNode[] };

type LegalDocumentProps = {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

/** Shared layout for policy pages: title, last-updated line and numbered sections. */
export function LegalDocument({ title, intro, updated, sections }: LegalDocumentProps) {
  return (
    <>
      <section className="bg-hero-wash py-[50px] md:pt-[54px]">
        <Container className="max-w-[820px]">
          <h1 className="font-display text-[clamp(38px,5vw,56px)] leading-[1.02] font-black tracking-[-2px] text-navy">{title}</h1>
          <p className="mt-4 text-[13px] font-bold tracking-[0.4px] text-orange uppercase">Last updated: {updated}</p>
          <p className="mt-5 text-[15px] leading-[1.75] text-muted">{intro}</p>
        </Container>
      </section>

      <Section>
        <Container className="max-w-[820px]">
          <div className="grid gap-[30px]">
            {sections.map((section, index) => (
              <div key={section.heading} className="rounded-[22px] border border-line bg-paper p-[24px] md:p-[30px]">
                <h2 className="mb-3 font-display text-[20px] leading-[1.25] font-bold text-navy md:text-[22px]">
                  <span className="mr-2 text-orange">{String(index + 1).padStart(2, "0")}.</span>
                  {section.heading}
                </h2>
                <div className="grid gap-3 text-[15px] leading-[1.75] text-muted">
                  {section.body.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
