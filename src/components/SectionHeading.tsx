import type { ReactNode } from "react";

type SectionHeadingProps = { eyebrow: string; title: ReactNode; description?: string };

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-7 max-w-[730px] text-center md:mb-9">
      <div className="text-xs font-black tracking-[1.4px] text-orange uppercase">{eyebrow}</div>
      <h2 className="my-3 text-[clamp(31px,4vw,45px)] leading-[1.08] font-black tracking-[-1.7px] text-navy">{title}</h2>
      {description ? <p className="text-[15px] leading-[1.75] text-muted">{description}</p> : null}
    </div>
  );
}
