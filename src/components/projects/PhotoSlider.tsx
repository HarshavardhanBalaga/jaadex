"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlaceholder } from "@/components/projects/ImagePlaceholder";

export type SlideItem = { src: string; alt: string; available: boolean };

const INTERVAL_MS = 2000;

// Cross-fades through the slides every 2 seconds. Pauses on hover or focus and
// stays still for users who prefer reduced motion. Caption is centred below.
export function PhotoSlider({ slides, caption, label }: { slides: SlideItem[]; caption: string; label: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, slides.length]);

  return (
    <figure
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-3xl border border-line bg-paper shadow-soft">
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={slide.src}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`}
            >
              {slide.available ? (
                <Image src={slide.src} alt={slide.alt} fill sizes="(min-width: 768px) 50vw, 100vw" priority={i === 0} className="object-cover" />
              ) : (
                <ImagePlaceholder src={slide.src} alt={slide.alt} fill />
              )}
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-center text-sm leading-snug font-bold text-navy">{caption}</figcaption>
    </figure>
  );
}
