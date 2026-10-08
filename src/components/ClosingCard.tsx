import type { ReactNode } from "react";

type ClosingCardProps = { title: string; description: string; children: ReactNode };

export function ClosingCard({ title, description, children }: ClosingCardProps) {
  return (
    <div className="relative flex flex-col items-start gap-[22px] overflow-hidden rounded-[32px] bg-linear-[120deg,#dce8ff,#ffe6d3] px-6 py-[30px] md:flex-row md:items-center md:justify-between md:gap-7 md:p-[43px]">
      <div className="max-w-[650px]">
        <h2 className="mb-3 font-display text-[clamp(28px,4vw,42px)] leading-[1.08] font-black tracking-[-1.4px] text-navy">{title}</h2>
        <p className="leading-[1.65] text-[#5a6a94]">{description}</p>
      </div>
      {children}
    </div>
  );
}
