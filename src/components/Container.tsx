import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-[min(72.5rem,calc(100%-2rem))] md:w-[min(72.5rem,calc(100%-2.5rem))] ${className}`}>{children}</div>;
}
