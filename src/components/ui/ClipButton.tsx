import type { ReactNode } from "react";

type ClipButtonProps = {
  href: string;
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
  children: ReactNode;
  className?: string;
};

const SIZES = {
  md: "h-[56px] px-8 text-[14px]",
  sm: "h-[48px] px-6 text-[12px]",
} as const;

/**
 * Shared button system — background + label both swap via
 * clip-path wipes (inset right→full) instead of color fades.
 * Same height family, radius, typography, alignment everywhere.
 */
export default function ClipButton({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: ClipButtonProps) {
  const base =
    variant === "primary" ? "clip-btn-primary" : "clip-btn-secondary";
  return (
    <a
      href={href}
      data-variant={variant}
      className={`clip-btn inline-flex items-center justify-center rounded-[7px] font-inter font-semibold uppercase tracking-[0.12em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2044] ${SIZES[size]} ${base}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true" className="clip-btn-fill" />
      <span className="clip-btn-label">
        <span
          className={`clip-btn-label-base ${variant === "primary" ? "text-white" : "text-[#0A2044]"}`}
        >
          {children}
        </span>
        <span aria-hidden="true" className="clip-btn-label-hover">
          {children}
        </span>
      </span>
    </a>
  );
}
