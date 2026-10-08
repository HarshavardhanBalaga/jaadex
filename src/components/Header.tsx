"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/site";
import { Brand } from "./Brand";
import { ButtonLink } from "./ButtonLink";
import { Container } from "./Container";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="bg-midnight px-[15px] py-[9px] text-center text-[13px] text-[#e8efff]">
        ⚡ Big ideas start small.{" "}
        <strong className="text-gold">
          Bring creativity into your classroom
        </strong>{" "}
        - explore JaaDeX.
      </div>
      <header className="sticky top-0 z-20 border-b border-royal/10 bg-paper/95 backdrop-blur-md">
        <Container className="flex h-[68px] items-center justify-between gap-[22px] md:h-[76px]">
          <Brand />
          <nav
            aria-label="Main navigation"
            className={`${menuOpen ? "flex" : "hidden"} absolute top-[68px] right-0 left-0 flex-col items-start gap-[19px] border-b border-line bg-paper px-[25px] pt-5 pb-6 text-lg font-black text-[#2b3a78] md:static md:flex md:flex-row md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0 md:text-lg lg:gap-5 lg:text-[16px]`}
          >
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`hover:text-orange ${active ? "text-orange" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink
              href="/contact?interest=Product%20Demonstration"
              size="normal"
              className="px-3 py-1.5 text-[11px] whitespace-nowrap sm:px-4 sm:py-[8px] sm:text-[15px]"
            >
              Book A Demo
            </ButtonLink>
            <button
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-2.5 py-2 text-royal md:hidden"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <Icon name="close" size={21} />
              ) : (
                <Icon name="menu" size={21} />
              )}
            </button>
          </div>
        </Container>
      </header>
    </>
  );
}
