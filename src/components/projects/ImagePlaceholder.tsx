// Neutral box shown in place of a photo that has not been uploaded yet.
// Shows the expected filename so it is clear which file to add.
export function ImagePlaceholder({
  src,
  alt,
  fill = false,
  width = 800,
  height = 600,
  className = "",
}: {
  src: string;
  alt: string; // empty string marks the placeholder as decorative
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  const filename = src.split("/").pop() ?? src;
  const decorative = alt === "";

  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      style={fill ? undefined : { aspectRatio: `${width} / ${height}` }}
      className={`grid place-items-center bg-[#d9dee9] p-3 text-center text-xs font-bold break-all text-[#52608a] ${fill ? "absolute inset-0" : "w-full"} ${className}`}
    >
      {filename}
    </div>
  );
}
