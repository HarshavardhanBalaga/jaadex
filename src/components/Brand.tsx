import Image from "next/image";
import Link from "next/link";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-block shrink-0 ${footer ? "rounded-xl bg-white px-3 py-2" : ""}`}
    >
      <Image
        src="/jaadex-logo.png"
        alt="JaaDeX Innovision Pvt Ltd — home"
        width={1200}
        height={304}
        priority={!footer}
        className={`w-auto ${footer ? "h-9" : "h-10 md:h-11"}`}
      />
    </Link>
  );
}
