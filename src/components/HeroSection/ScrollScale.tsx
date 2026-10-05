"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MIN = 0.8;
const MAX = 1;

/**
 * Scroll-driven scale wrapper — the mockup starts 20% smaller
 * (scale 0.8) and grows to full size as it travels up the viewport.
 * Transform lives on the inner node; progress is measured from the
 * unscaled outer node so scaling never feeds back into the math.
 * Smoothed with a lerped rAF loop; disabled for reduced motion.
 */
export default function ScrollScale({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = MIN;
    let current = MIN;
    let raf = 0;

    const measure = () => {
      const vh = window.innerHeight || 1;
      const top = outer.getBoundingClientRect().top;
      const start = vh * 0.95;
      const end = vh * 0.3;
      const raw = (start - top) / (start - end);
      const clamped = Math.max(0, Math.min(1, raw));
      const eased = clamped * clamped * (3 - 2 * clamped);
      target = MIN + (MAX - MIN) * eased;
    };

    const tick = () => {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0005) current = target;
      inner.style.transform = `scale(${current.toFixed(4)})`;
      raf = requestAnimationFrame(tick);
    };

    measure();
    current = target;
    inner.style.transform = `scale(${current.toFixed(4)})`;
    raf = requestAnimationFrame(tick);

    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={outerRef}>
      <div
        ref={innerRef}
        className="scroll-scale-inner"
        style={{ transform: "scale(0.8)", transformOrigin: "50% 0" }}
      >
        {children}
      </div>
    </div>
  );
}
