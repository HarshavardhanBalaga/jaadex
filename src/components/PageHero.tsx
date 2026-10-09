import type { ReactNode } from "react";
import { Container } from "./Container";
import { Eyebrow } from "./Eyebrow";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  art: string;
  children?: ReactNode;
}; 

export function PageHero({ eyebrow, title, description, art, children }: PageHeroProps) {
  return (
    <section className="bg-hero-wash py-[50px] md:pt-[54px]">
      <Container className="grid items-center gap-[25px] md:grid-cols-[1.15fr_.85fr] md:gap-[35px]">
        <div>
          <Eyebrow>✦ {eyebrow}</Eyebrow>
          <h1 className="my-5 font-display text-5xl leading-[.99] font-black tracking-[-2.5px] text-navy max-[400px]:text-[42px] md:text-[clamp(39px,5vw,60px)] md:tracking-[-2.6px] [&>span]:block [&>span]:text-orange">{title}</h1>
          <p className="mb-[25px] max-w-[640px] leading-[1.75] text-[#4a5a85]">{description}</p>
          {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
        </div>
        <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-[30px] bg-linear-[150deg,#dce8ff,#ffe6d3] md:min-h-[280px]" role="img" aria-label={`${eyebrow} illustration`}>
          <span className="text-[90px] drop-shadow-[0_12px_5px_rgb(7_7_80/0.125)] md:text-[115px]" aria-hidden="true">{art}</span>
          <span className="absolute right-5 bottom-[15px] text-[28px] text-royal/35" aria-hidden="true">✦ ✿ ✦</span>
        </div>
      </Container>
    </section>
  );
}
