export type NumberedItem = { title: string; description: string };

/** Vertical list with a large number beside each point. */
export function NumberedList({ items }: { items: NumberedItem[] }) {
  return (
    <ol className="mx-auto flex max-w-[760px] flex-col gap-[14px]">
      {items.map((item, index) => (
        <li
          key={item.title}
          className="flex items-start gap-5 rounded-[22px] border border-line bg-paper p-[22px] shadow-[0_8px_22px_rgb(20_60_160/0.03)] md:gap-7 md:p-[26px]"
        >
          <span className="w-[52px] shrink-0 font-display text-[44px] leading-none font-black text-royal-dark tabular-nums md:w-[64px] md:text-[56px]" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-display text-[18px] leading-[1.25] font-bold text-navy md:text-[20px]">{item.title}</h3>
            <p className="mt-1.5 text-[14px] leading-[1.7] text-muted">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
