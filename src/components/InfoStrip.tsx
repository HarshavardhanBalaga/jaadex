import { Container } from "./Container";

export function InfoStrip({ items }: { items: { icon: string; label: string }[] }) {
  return (
    <div className="border-y border-line bg-paper py-[21px]">
      <Container className="flex flex-wrap items-center justify-around gap-[18px]">
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-[13px] font-black text-[#55658f]">
            <span className="text-[22px]" aria-hidden="true">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </Container>
    </div>
  );
}
