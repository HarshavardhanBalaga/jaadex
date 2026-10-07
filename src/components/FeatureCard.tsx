import Link from "next/link";
import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export function FeatureCard({ icon, title, description, href, linkLabel = "Explore more" }: FeatureCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[25px] border border-royal/5 bg-[#dfe9ff] px-[21px] py-6 transition duration-200 hover:-translate-y-1.5 hover:shadow-soft motion-reduce:transition-none md:min-h-[235px] nth-[4n+2]:bg-[#ffe9d9] nth-[4n+3]:bg-[#def3de] nth-[4n+4]:bg-[#ebe3ff]">
      <div className="mb-[19px] grid size-16 place-items-center rounded-[20px] bg-white/75 text-royal shadow-[0_5px_0_rgb(10_30_100/0.05)]" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mb-2 text-[19px] font-black text-navy">{title}</h3>
      <p className="mb-[15px] text-[13px] leading-[1.65] text-[#53628a]">{description}</p>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-[7px] text-[13px] font-black text-royal hover:text-orange">
          {linkLabel} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}
