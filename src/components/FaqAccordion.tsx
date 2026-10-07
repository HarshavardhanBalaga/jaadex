"use client";

import { Icon } from "@/components/Icon";
import { useState } from "react";

export type FaqItem = { question: string; answer: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-[820px]">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div className="border-b border-line" key={item.question}>
            <button
              className="flex w-full cursor-pointer justify-between gap-[15px] py-[19px] text-left text-[15px] font-black text-navy focus-visible:outline-2 focus-visible:outline-orange"
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span>{item.question}</span>
              <Icon name="plus" size={21} className={`shrink-0 text-orange transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-45" : ""}`} />
            </button>
            {open ? <div className="pr-[30px] pb-5 text-sm leading-[1.7] text-muted">{item.answer}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
