"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ClipButton from "@/components/ui/ClipButton";

const LINKS = [
  { label: "Product", href: "#start" },
  { label: "Schools", href: "#schools" },
  { label: "Pricing", href: "#start" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#0A2044]/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-6 sm:px-10 lg:px-14">
        <Link
          href="/"
          className="flex h-[40px] items-center"
          aria-label="Jaadex home"
        >
          <Image
            src="/logo/jaadexlogo.png"
            alt="Jaadex"
            width={132}
            height={36}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
          {LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-inter text-[12px] font-medium uppercase tracking-[0.2em] text-[#0A2044]/60 transition-colors hover:text-[#0A2044]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#schools"
            className="font-inter text-[12px] font-medium uppercase tracking-[0.2em] text-[#0A2044]/60 transition-colors hover:text-[#0A2044]"
          >
            Sign in
          </a>
          <ClipButton href="#start" variant="secondary" size="sm">
            Get Started
          </ClipButton>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[7px] border border-[#0A2044]/15 text-[#0A2044] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" className="relative block h-3 w-5">
            <span
              className={`absolute left-0 top-0 h-[2px] w-full bg-current transition-transform duration-200 ${open ? "translate-y-[5px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-[5px] h-[2px] w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 top-[10px] h-[2px] w-full bg-current transition-transform duration-200 ${open ? "-translate-y-[5px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-[#0A2044]/10 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col px-6 py-4">
            {LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-[#0A2044]/10 py-3.5 font-inter text-[12px] font-medium uppercase tracking-[0.2em] text-[#0A2044]/70 last:border-0 hover:text-[#0A2044]"
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 py-4">
              <ClipButton href="#start" variant="secondary" size="sm">
                Get Started
              </ClipButton>
              <a
                href="#schools"
                onClick={() => setOpen(false)}
                className="text-center font-inter text-[12px] font-medium uppercase tracking-[0.2em] text-[#0A2044]/60 hover:text-[#0A2044]"
              >
                Sign in
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
