import type { ReactNode } from "react";

type SectionProps = { children: ReactNode; id?: string; topless?: boolean; className?: string };

export function Section({ children, id, topless = false, className = "" }: SectionProps) {
  const spacing = topless ? "pb-[58px] md:pb-[76px]" : "py-[58px] md:py-[76px]";
  return <section id={id} className={`${spacing} ${className}`}>{children}</section>;
}
