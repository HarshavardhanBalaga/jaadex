import type { ReactNode } from "react";
import { Container } from "./Container";

export function CalloutBand({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-royal py-[60px] text-white">
      <Container className="grid items-center gap-7 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="mb-3 text-[clamp(29px,4vw,43px)] leading-[1.1] font-black tracking-[-1.4px]">{title}</h2>
          <p className="max-w-[680px] leading-[1.7] text-[#d6e2ff]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-[11px] max-md:mt-1.5">{children}</div>
      </Container>
    </section>
  );
}
