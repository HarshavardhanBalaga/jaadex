import type { ReactNode } from "react";
import { Container } from "./Container";
import { ButtonLink } from "./ButtonLink";

type HeroProps = {
  title: ReactNode;
  description: string;
  cta: {
    label: string;
    href: string;
  };
};

export function Hero({ title, description, cta }: HeroProps) {
  return (
    <section className="relative flex min-h-[calc(100svh-106px)] flex-col justify-end overflow-hidden bg-navy md:min-h-[calc(100svh-114px)]">
      {/* Full-bleed video fills remaining viewport after header */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/logo/jaadex-hero-video.mp4" type="video/mp4" />
      </video>

      {/* Compact card bottom-left, slightly overlapping video (~20% of card over video edge zone) */}
      <Container className="relative z-10 pb-8 md:pb-10">
        <div className="max-w-[340px] -translate-x-[3%] rounded-[20px] border border-line bg-white p-5 shadow-soft md:max-w-[380px] md:-translate-x-[12%] md:p-6">
          <h1 className="font-display text-[30px] leading-[1.05] font-black tracking-[-1px] text-navy md:text-[36px]">
            {title}
          </h1>
          <p className="mt-2.5 mb-5 text-[13px] leading-[1.65] text-muted">
            {description}
          </p>
          <ButtonLink href={cta.href} size="normal">
            {cta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
