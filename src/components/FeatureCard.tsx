import Link from "next/link";
import type { ReactNode } from "react";

type FeatureCardTone = "blue" | "peach" | "lilac" | "mint";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  tone?: FeatureCardTone;
};

const toneStyles: Record<FeatureCardTone, { card: string; glow: string; icon: string }> = {
  blue: {
    card: "from-[#eef3ff] via-[#ffffff] to-[#d9e6ff]",
    glow: "from-[#1450d6]/15 via-[#18a8ee]/10 to-transparent",
    icon: "from-[#e2ebff] to-[#cfdefc] text-royal border-[#c2d4f8]/70",
  },
  peach: {
    card: "from-[#fff5e9] via-[#ffffff] to-[#ffdfba]",
    glow: "from-[#f4690d]/15 via-[#ffb02e]/10 to-transparent",
    icon: "from-[#ffead3] to-[#ffd9b0] text-orange-dark border-[#f5cfa4]/70",
  },
  lilac: {
    card: "from-[#f2ebff] via-[#ffffff] to-[#dccdff]",
    glow: "from-[#6d3fd6]/15 via-[#b79cff]/10 to-transparent",
    icon: "from-[#e8ddff] to-[#d3bfff] text-purple border-[#cbb6f5]/70",
  },
  mint: {
    card: "from-[#e7f8fa] via-[#ffffff] to-[#c9ecf0]",
    glow: "from-[#1b9aaa]/15 via-[#18a8ee]/10 to-transparent",
    icon: "from-[#d5f0f3] to-[#bce4e9] text-teal border-[#a9d8dd]/70",
  },
};

export function FeatureCard({ icon, title, description, href, linkLabel = "Explore more", tone = "blue" }: FeatureCardProps) {
  const styles = toneStyles[tone];
  return (
    <article
      className={`group relative overflow-hidden rounded-[25px] border border-line bg-gradient-to-br ${styles.card} bg-[length:180%_180%] bg-[position:0%_0%] px-[21px] py-6 shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_10px_28px_rgb(20_50_150/0.06)] transition-all duration-500 ease-out hover:-translate-y-1 hover:bg-[position:100%_100%] hover:border-royal/25 hover:shadow-soft motion-reduce:transition-none md:min-h-[235px]`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br ${styles.glow} blur-2xl transition-all duration-500 ease-out group-hover:scale-[1.35] group-hover:-translate-x-2 group-hover:translate-y-2`} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80" />
      <div className={`relative mb-[19px] grid size-16 place-items-center rounded-[20px] border bg-gradient-to-br shadow-[0_6px_16px_rgb(20_50_150/0.10),0_1px_0_rgb(255_255_255/0.8)_inset] ${styles.icon}`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="relative mb-2 font-display text-[19px] font-black text-navy">{title}</h3>
      <p className="relative mb-[15px] text-[13px] leading-[1.65] text-[#53628a]">{description}</p>
      {href ? (
        <Link href={href} className="relative inline-flex items-center gap-[7px] text-[13px] font-black text-royal hover:text-orange">
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}

