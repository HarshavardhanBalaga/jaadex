import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

/** Status message for the register page. Plain markup, so server and client components can both use it. */
export function RegistrationNotice({ tone = "info", title, children }: { tone?: "success" | "info"; title: string; children: ReactNode }) {
  const success = tone === "success";
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-[13px] p-[15px] ${success ? "bg-[#e8f6e8]" : "border border-[#cfd9f0] bg-[#f5f8ff]"}`}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-white ${success ? "bg-green" : "bg-royal"}`}>
        <Icon name={success ? "check" : "heart"} size={17} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[16px] font-bold text-navy">{title}</p>
        <p className="mt-1 text-[14px] leading-[1.6] text-muted">{children}</p>
      </div>
    </div>
  );
}
