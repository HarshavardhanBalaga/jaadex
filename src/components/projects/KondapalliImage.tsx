import "server-only";
import Image from "next/image";
import { assetExists } from "@/lib/projects/assets";
import { ImagePlaceholder } from "@/components/projects/ImagePlaceholder";

type KondapalliImageProps = {
  src: string; // public path, e.g. "/assets/kondapalli/ch01-master.png"
  alt: string; // empty string marks the image as decorative
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  eager?: boolean; // load now instead of lazily (for images visible on first paint)
  className?: string;
};

// Renders the real image when the file exists in /public, otherwise a neutral
// placeholder. Full-bleed backgrounds fall back to nothing so the section's own
// gradient shows instead.
export function KondapalliImage({ src, alt, width = 800, height = 600, fill = false, sizes, priority, eager = false, className = "" }: KondapalliImageProps) {
  const loading = eager ? "eager" : undefined;

  if (!assetExists(src)) {
    // Decorative full-bleed backgrounds fall back to nothing; photos keep a placeholder.
    if (fill && alt === "") return null;
    return <ImagePlaceholder src={src} alt={alt} fill={fill} width={width} height={height} className={className} />;
  }

  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} loading={loading} className={className} />;
  }

  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} loading={loading} className={className} />;
}
