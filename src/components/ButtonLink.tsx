import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "dark" | "light";
  size?: "normal" | "small";
  className?: string;
};

const variants = {
  primary: "bg-orange text-white shadow-pop-orange",
  dark: "bg-royal text-white shadow-pop-royal",
  light: "border border-line bg-white text-royal",
};

const sizes = {
  normal: "px-5 py-[13px]",
  small: "px-3.5 py-2.5 text-xs",
};

export function ButtonLink({ href, children, variant = "primary", size = "normal", className = "" }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-center font-black transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange motion-reduce:transition-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
