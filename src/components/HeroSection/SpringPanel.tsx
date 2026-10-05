"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type SpringPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Max magnetic displacement in px at the panel edge. */
  strength?: number;
  /** Max tilt in degrees at the panel edge. */
  tilt?: number;
  /** Scale while the pointer is over the panel. */
  hoverScale?: number;
  label?: string;
};

/**
 * Magnetic spring wrapper — each product section gets physical weight.
 * Pointer position drives a spring target (translate + tilt + scale);
 * on release an under-damped integrator overshoots before settling.
 * Transform is written directly to the DOM (no re-renders per frame).
 */
export default function SpringPanel({
  children,
  className = "",
  style,
  strength = 8,
  tilt = 5,
  hoverScale = 1.02,
  label,
}: SpringPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0, rx: 0, ry: 0, s: 1 };
    const cur = { x: 0, y: 0, rx: 0, ry: 0, s: 1 };
    const vel = { x: 0, y: 0, rx: 0, ry: 0, s: 1 };

    const STIFF = 170;
    const DAMP = 12.5;
    const SCALE_STIFF = 210;
    const SCALE_DAMP = 14;

    const setActiveState = (v: boolean) => {
      if (activeRef.current !== v) {
        activeRef.current = v;
        setActive(v);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const ny = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      const cx = Math.max(-0.6, Math.min(0.6, nx));
      const cy = Math.max(-0.6, Math.min(0.6, ny));
      target.x = cx * strength * 2;
      target.y = cy * strength * 2;
      target.ry = cx * tilt * 2;
      target.rx = -cy * tilt * 2;
      target.s = hoverScale;
      setActiveState(true);
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      target.rx = 0;
      target.ry = 0;
      target.s = 1;
      setActiveState(false);
    };

    let raf = 0;
    let last = performance.now();

    const step = (axis: "x" | "y" | "rx" | "ry" | "s", k: number, d: number, dt: number) => {
      const f = -k * (cur[axis] - target[axis]) - d * vel[axis];
      vel[axis] += f * dt;
      cur[axis] += vel[axis] * dt;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.008, (now - last) / 1000));
      last = now;
      step("x", STIFF, DAMP, dt);
      step("y", STIFF, DAMP, dt);
      step("rx", STIFF, DAMP, dt);
      step("ry", STIFF, DAMP, dt);
      step("s", SCALE_STIFF, SCALE_DAMP, dt);

      const settled =
        Math.abs(cur.x - target.x) < 0.05 &&
        Math.abs(cur.y - target.y) < 0.05 &&
        Math.abs(cur.rx - target.rx) < 0.02 &&
        Math.abs(cur.ry - target.ry) < 0.02 &&
        Math.abs(cur.s - target.s) < 0.0005 &&
        Math.abs(vel.x) < 0.05 &&
        Math.abs(vel.y) < 0.05;

      if (!settled || activeRef.current) {
        node.style.transform = `perspective(1000px) translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(4)})`;
      } else if (node.style.transform !== "") {
        node.style.transform = "";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    node.addEventListener("pointercancel", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      node.removeEventListener("pointercancel", onLeave);
    };
  }, [strength, tilt, hoverScale]);

  return (
    <div
      ref={ref}
      data-physics-panel={label ?? true}
      className={`spring-panel${active ? " spring-panel-active" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
