"use client";

import { useId, useState } from "react";

/**
 * Lightweight, dependency-free charts for the Kids Challenge dashboard.
 * Single series each (one hue, no legend; the panel title names it), thin bars with 2px gaps
 * and 4px rounded data-ends, recessive grid, a hover/focus tooltip, and a screen-reader table.
 */

export type DailyDatum = { key: string; label: string; value: number; display: string; detail?: string };

/** Round the axis maximum up to a friendly number so gridlines land on clean values. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
}

export function DailyBarChart({
  data,
  label,
  formatAxis,
}: {
  data: DailyDatum[];
  /** Accessible name, e.g. "Revenue per day". */
  label: string;
  formatAxis: (value: number) => string;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const gridValues = [max, max / 2, 0];
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  const hovered = active !== null ? data[active] : null;

  return (
    <figure aria-labelledby={`${id}-caption`} className="m-0">
      <figcaption id={`${id}-caption`} className="sr-only">
        {label}
      </figcaption>
      <div className="flex gap-3">
        {/* Y axis labels */}
        <div className="relative h-[200px] w-12 shrink-0 text-right text-[11px] text-[#6b7799] tabular-nums" aria-hidden="true">
          {gridValues.map((v, i) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / (gridValues.length - 1)) * 100}%` }}>
              {formatAxis(v)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {/* Gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[200px]" aria-hidden="true">
            {gridValues.map((v, i) => (
              <div key={v} className={`absolute inset-x-0 border-t ${i === gridValues.length - 1 ? "border-[#b9c3dc]" : "border-dashed border-[#e3e8f4]"}`} style={{ top: `${(i / (gridValues.length - 1)) * 100}%` }} />
            ))}
          </div>
          {/* Bars: hit target is the full column, bigger than the mark. */}
          <div className="relative flex h-[200px] items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <button
                key={d.key}
                type="button"
                aria-label={`${d.label}: ${d.display}${d.detail ? `, ${d.detail}` : ""}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
              >
                <span
                  className={`block w-full rounded-t-[4px] transition-colors ${d.value > 0 ? "min-h-[3px]" : ""} ${
                    active === i ? "bg-royal-dark" : "bg-royal"
                  } group-focus-visible:ring-2 group-focus-visible:ring-orange group-focus-visible:ring-offset-1`}
                  style={{ height: `${(d.value / max) * 100}%` }}
                />
              </button>
            ))}
          </div>
          {/* Tooltip */}
          {hovered && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg bg-navy px-3 py-2 text-[12px] whitespace-nowrap text-white shadow-soft"
              style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold">{hovered.label}</p>
              <p className="tabular-nums">{hovered.display}</p>
              {hovered.detail && <p className="text-white/75 tabular-nums">{hovered.detail}</p>}
            </div>
          )}
          {/* X axis labels */}
          <div className="relative mt-2 h-4 text-[11px] text-[#6b7799]" aria-hidden="true">
            {data.map((d, i) =>
              i % tickEvery === 0 || i === data.length - 1 ? (
                <span key={d.key} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>
                  {d.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>
                {d.display}
                {d.detail ? ` (${d.detail})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export type BreakdownDatum = { key: string; label: string; value: number; display: string; note?: string };

/** Horizontal bars, values direct-labelled (few rows, so every label fits and no hover is needed to read them). */
export function BreakdownBars({ data, label, empty }: { data: BreakdownDatum[]; label: string; empty: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (data.length === 0 || max === 0) return <p className="px-6 py-8 text-center text-[13px] text-[#4a5a85]">{empty}</p>;
  return (
    <ul aria-label={label} className="grid gap-2.5 px-6 py-5">
      {data.map((d) => (
        <li key={d.key} className="grid grid-cols-[minmax(84px,30%)_1fr_auto] items-center gap-3 text-[13px]" title={d.note ? `${d.label}: ${d.display} · ${d.note}` : undefined}>
          <span className="truncate font-medium text-navy">{d.label}</span>
          <span className="h-3 overflow-hidden rounded-r-[4px] bg-[#eef2fb]" aria-hidden="true">
            <span className="block h-full rounded-r-[4px] bg-royal" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="text-right whitespace-nowrap text-[#2b3a63] tabular-nums">
            <span className="font-semibold text-navy">{d.display}</span>
            {d.note && <span className="text-[#6b7799]"> · {d.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
