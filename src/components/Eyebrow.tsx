import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d5e0fa] bg-[#ffffff] px-[13px] py-2 text-[11px] font-black tracking-[1px] text-royal uppercase">
      {children}
    </div>
  );
}
