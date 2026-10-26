"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CarouselImage = { src: string; alt: string };

type ImageCarouselProps = {
  images: CarouselImage[];
  intervalMs?: number;
};

/** Auto-advancing image carousel with arrow and dot controls. Pauses on hover and focus. */
export function ImageCarousel({ images, intervalMs = 4000 }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  // Restarts the timer on every change, so a manual arrow click gets a full interval.
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, index, paused]);

  const go = (next: number) => setIndex((next + count) % count);

  const arrowClass =
    "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow-soft transition-colors hover:bg-white hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange";

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-[30px] bg-navy">
        {images.map((image, i) => (
          <div
            key={image.src}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === index ? "opacity-100" : "opacity-0"}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              loading={i === 0 ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 1000px, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <button type="button" aria-label="Previous image" onClick={() => go(index - 1)} className={`${arrowClass} left-3 md:left-5`}>
        <i className="ri-arrow-left-s-line text-2xl" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Next image" onClick={() => go(index + 1)} className={`${arrowClass} right-3 md:right-5`}>
        <i className="ri-arrow-right-s-line text-2xl" aria-hidden="true" />
      </button>

      <div className="mt-4 flex justify-center gap-2">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Show image ${i + 1}`}
            aria-current={i === index}
            onClick={() => go(i)}
            className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-orange" : "w-2.5 bg-royal/25 hover:bg-royal/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
