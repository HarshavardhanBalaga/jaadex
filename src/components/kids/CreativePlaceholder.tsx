import type { ReactNode } from "react";

/**
 * Stand-in for an illustration that has not been supplied yet. Fixed aspect ratio,
 * so the layout never shifts when the real image replaces it. The label describes
 * the intended visual. Replace with next/image when the artwork is ready.
 */
export function CreativePlaceholder({
  description,
  ratio = "4 / 3",
  children,
  className = "",
}: {
  description: string;
  ratio?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <figure
      role="img"
      aria-label={`Image placeholder: ${description}`}
      style={{ aspectRatio: ratio }}
      className={`relative grid w-full place-items-center overflow-hidden rounded-[26px] border-2 border-dashed border-royal/30 bg-[#eef3ff] p-5 text-center ${className}`}
    >
      {children ? <div className="text-4xl leading-none" aria-hidden="true">{children}</div> : null}
      <figcaption className="mt-3 text-xs font-bold text-muted">[Placeholder] {description}</figcaption>
    </figure>
  );
}
