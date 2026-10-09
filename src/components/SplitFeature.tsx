import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Container } from "./Container";

type SplitFeatureProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  art: string;
  artLabel?: string;
  children?: ReactNode;
  reverse?: boolean;
};

export function SplitFeature({ eyebrow, title, description, points, art, artLabel = "Creative learning", children, reverse = false }: SplitFeatureProps) {
  return (
    <section className="bg-[#eef3ff] py-[58px] md:py-[76px]">
      <Container className="grid items-center gap-[25px] md:grid-cols-[.9fr_1.1fr] md:gap-[54px]">
        <div
          className={`relative grid min-h-[290px] place-items-center overflow-hidden rounded-[32px] bg-linear-[145deg,#ffd2a8,#ff9a55] before:absolute before:size-[280px] before:rounded-full before:bg-[#ffe6d1] before:content-[''] md:min-h-[365px] ${reverse ? "md:order-2" : ""}`}
        >
          <div className="absolute top-[22px] left-5 z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">✦ {artLabel}</div>
          <span className="relative z-1 text-[120px] drop-shadow-[0_12px_5px_rgb(150_60_10/0.15)] md:text-[145px]" aria-hidden="true">{art}</span>
          <div className="absolute right-[18px] bottom-[22px] z-2 rounded-[15px] bg-white px-3.5 py-3 text-xs font-black shadow-soft">🌟 Every idea matters</div>
        </div>
        <div>
          <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">{eyebrow}</div>
          <h2 className="my-3 font-display text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">{title}</h2>
          <p className="text-[15px] leading-[1.75] text-muted">{description}</p>
          <ul className="my-[23px] grid gap-[13px]">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm font-extrabold text-[#2f3f7a]">
                <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#dce8ff] text-royal"><Icon name="check" size={14} /></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {children}
        </div>
      </Container>
    </section>
  );
}
