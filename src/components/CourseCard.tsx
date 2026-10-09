import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type CourseCardTone = "blue" | "peach" | "lilac" | "mint";

type CourseCardProps = {
  imageSrc: string;
  imageAlt: string;
  tone?: CourseCardTone;
  meta: string;
  pill: string;
  title: string;
  description: string;
  footerNote: string;
  footerIcon: ReactNode;
  href?: string;
  linkLabel?: string;
};

const toneStyles: Record<CourseCardTone, { card: string; glow: string; pill: string }> = {
  blue: {
    card: "from-[#eef3ff] via-[#ffffff] to-[#d9e6ff]",
    glow: "from-[#1450d6]/15 via-[#18a8ee]/10 to-transparent",
    pill: "bg-[#e2ebff] text-royal border-[#c2d4f8]/70",
  },
  peach: {
    card: "from-[#fff5e9] via-[#ffffff] to-[#ffdfba]",
    glow: "from-[#f4690d]/15 via-[#ffb02e]/10 to-transparent",
    pill: "bg-[#ffead3] text-orange-dark border-[#f5cfa4]/70",
  },
  lilac: {
    card: "from-[#f2ebff] via-[#ffffff] to-[#dccdff]",
    glow: "from-[#6d3fd6]/15 via-[#b79cff]/10 to-transparent",
    pill: "bg-[#e8ddff] text-purple border-[#cbb6f5]/70",
  },
  mint: {
    card: "from-[#e7f8fa] via-[#ffffff] to-[#c9ecf0]",
    glow: "from-[#1b9aaa]/15 via-[#18a8ee]/10 to-transparent",
    pill: "bg-[#d5f0f3] text-teal border-[#a9d8dd]/70",
  },
};

export function CourseCard({
  imageSrc,
  imageAlt,
  tone = "blue",
  meta,
  pill,
  title,
  description,
  footerNote,
  footerIcon,
  href,
  linkLabel = "Enquire",
}: CourseCardProps) {
  const styles = toneStyles[tone];
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[25px] border border-line bg-gradient-to-br ${styles.card} bg-[length:180%_180%] bg-[position:0%_0%] shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_10px_28px_rgb(20_50_150/0.06)] transition-all duration-500 ease-out hover:-translate-y-1 hover:bg-[position:100%_100%] hover:border-royal/25 hover:shadow-soft motion-reduce:transition-none`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute -right-12 -top-12 z-0 size-40 rounded-full bg-gradient-to-br ${styles.glow} blur-2xl transition-all duration-500 ease-out group-hover:scale-[1.35] group-hover:-translate-x-2 group-hover:translate-y-2`} />
      <div className="relative h-[172px] w-full shrink-0 overflow-hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy/15 via-transparent to-transparent" />
      </div>
      <div className="relative flex flex-1 flex-col px-[21px] py-6">
        <div className="mb-3 flex items-center justify-between gap-2 text-[12px] font-bold text-muted">
          <span>{meta}</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black tracking-wide ${styles.pill}`}>
            {pill}
          </span>
        </div>
        <h3 className="mb-2 font-display text-[19px] font-black text-navy">{title}</h3>
        <p className="mb-5 text-[13px] leading-[1.65] text-[#53628a]">{description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-4">
          
          {href ? (
            <Link href={href} className="inline-flex shrink-0 items-center gap-[7px] text-[13px] font-black text-royal hover:text-orange">
              {linkLabel} <span aria-hidden="true"></span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
