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
        🌱 Big ideas start small. <strong className="text-gold">Bring creativity into your classroom</strong> — explore JaaDeX.
      </div>
      <header className="sticky top-0 z-20 border-b border-royal/10 bg-paper/95 backdrop-blur-md">
        <Container className="flex h-[68px] items-center justify-between gap-[22px] md:h-[76px]">
          <Brand />
          <nav
            aria-label="Main navigation"
            className={`${menuOpen ? "flex" : "hidden"} absolute top-[68px] right-0 left-0 flex-col items-start gap-[19px] border-b border-line bg-paper px-[25px] pt-5 pb-6 text-[13px] font-black text-[#2b3a78] md:static md:flex md:flex-row md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0 md:text-xs lg:gap-5 lg:text-[13px]`}
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
          <div className="flex items-center gap-[9px]">
            <ButtonLink href="/contact" variant="light" size="small" className="max-lg:hidden">Contact us</ButtonLink>
            <ButtonLink href="/contact?interest=Product%20Demonstration" size="small" className="max-[400px]:px-[11px] max-[400px]:py-2.5 max-[400px]:text-[11px]">Partner with us ↗</ButtonLink>
            <button
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-3 py-[9px] text-royal md:hidden"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <Icon name="close" size={21} /> : <Icon name="menu" size={21} />}
            </button>
          </div>
        </Container>
      </header>
    </>
  );
}
