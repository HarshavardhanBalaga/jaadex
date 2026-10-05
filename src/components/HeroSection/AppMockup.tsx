import SpringPanel from "./SpringPanel";
import { INSPECTOR, LAYERS, TOOLS, TRACKS } from "./mockup-data";

export default function AppMockup() {
  return (
    <div className="hero-mock-anim relative select-none">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -top-10 bottom-[-56px] bg-[radial-gradient(55%_55%_at_50%_30%,rgba(245,130,50,0.12),transparent_70%)]"
      />
      <div className="relative overflow-hidden rounded-[14px] border border-[#0A2044]/15 bg-[#0A2044] shadow-[0_48px_96px_-48px_rgba(10,32,68,0.55)]">
        <SpringPanel
          label="toolbar"
          strength={5}
          tilt={2.5}
          hoverScale={1.008}
          className="relative z-30 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0A2044] px-5 py-3.5"
        >
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <span className="font-inter text-[11px] font-semibold tracking-[0.18em] text-white/60">JAADEX STUDIO</span>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 font-inter text-[10px] font-medium text-white/55 lg:flex">
              <span aria-hidden="true" className="status-dot h-1.5 w-1.5 rounded-full bg-[#F58232]" />
              Lesson 04 — Saved
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden font-inter text-[11px] font-medium tabular-nums text-white/45 sm:inline">00:02:14 · 24fps</span>
            <span className="rounded-[5px] border border-white/15 px-3 py-[7px] font-inter text-[11px] font-semibold tracking-[0.06em] text-white/80">PREVIEW</span>
            <span className="rounded-[5px] bg-[#F58232] px-3.5 py-[7px] font-inter text-[11px] font-semibold tracking-[0.06em] text-white">EXPORT</span>
          </div>
        </SpringPanel>
        <div className="relative z-10 grid gap-3 p-3 sm:p-4 lg:grid-cols-[64px_minmax(0,1fr)_216px] lg:grid-rows-[auto_auto] lg:gap-4 lg:p-4">
          <SpringPanel
            label="tools"
            strength={9}
            tilt={4}
            hoverScale={1.025}
            className="relative z-20 order-2 rounded-[10px] border border-white/10 bg-[#0D2450] p-3 lg:order-1 lg:row-span-2 lg:p-2.5"
          >
            <p className="hidden font-inter text-[9px] font-medium uppercase tracking-[0.2em] text-white/35 lg:block">Tools</p>
            <div className="flex gap-2 lg:mt-2.5 lg:flex-col">
              {TOOLS.map((tool, i) => (
                <span
                  key={tool}
                  className={`flex h-10 flex-1 items-center justify-center rounded-[7px] border font-inter text-[10px] font-semibold uppercase tracking-[0.08em] lg:h-11 lg:w-full ${
                    i === 0
                      ? "border-[#F58232] bg-[#F58232] text-white"
                      : "border-white/10 bg-white/[0.05] text-white/60"
                  }`}
                >
                  {tool.slice(0, 1)}
                  <span className="sr-only">{tool}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 hidden font-inter text-[9px] font-medium uppercase tracking-[0.2em] text-white/35 lg:block">Layers</p>
            <div className="mt-2 hidden space-y-1.5 lg:block">
              {LAYERS.map((layer) => (
                <div
                  key={layer.name}
                  className="flex items-center justify-between rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1.5"
                >
                  <div>
                    <p className="font-inter text-[10px] font-semibold text-white/85">{layer.name}</p>
                    <p className="font-inter text-[9px] text-white/35">{layer.meta}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${layer.on ? "bg-[#F58232]" : "bg-white/20"}`}
                  />
                </div>
              ))}
            </div>
          </SpringPanel>
          <SpringPanel
            label="canvas"
            strength={7}
            tilt={3}
            hoverScale={1.015}
            className="relative z-10 order-1 overflow-hidden rounded-[10px] bg-white lg:order-2"
          >
            <div className="relative flex aspect-[16/8.2] items-center justify-center sm:aspect-[16/7.2]">
              <svg aria-hidden="true" viewBox="0 0 640 220" className="absolute bottom-0 h-[48%] w-full" preserveAspectRatio="none">
                <path d="M0 150 Q 140 40 300 115 T 640 95 V220 H0 Z" fill="#0A2044" opacity="0.08" />
                <path d="M0 175 Q 170 80 350 140 T 640 135 V220 H0 Z" fill="#0A2044" opacity="0.12" />
              </svg>
              <div aria-hidden="true" className="absolute aspect-square h-[64%] rounded-full border border-dashed border-[#0A2044]/20" />
              <div aria-hidden="true" className="absolute left-[12%] top-[18%] rounded-[4px] border border-[#0A2044]/15 bg-white/80 px-2 py-1 font-inter text-[9px] font-semibold uppercase tracking-[0.12em] text-[#0A2044]/55">
                Scene 04
              </div>
              <div className="drift-anim relative flex h-20 w-20 items-center justify-center rounded-full bg-[#F58232] sm:h-24 sm:w-24">
                <div className="h-11 w-11 rounded-full bg-white/40 sm:h-12 sm:w-12" />
              </div>
              <div aria-hidden="true" className="float-anim absolute right-[17%] top-[20%] h-8 w-8 rounded-full bg-[#0A2044]" />
              <div aria-hidden="true" className="absolute bottom-[18%] right-[30%] h-3 w-3 rotate-45 bg-[#F58232]/70" />
            </div>
            <div className="relative flex items-center justify-between border-t border-[#0A2044]/10 bg-white px-4 py-3">
              <div aria-hidden="true" className="flex gap-4 font-inter text-[10px] font-semibold tracking-[0.1em] text-[#0A2044]/45 sm:text-[11px]">
                <span className="rounded-[4px] bg-[#0A2044] px-2 py-1 text-white">SELECT</span><span className="hidden sm:inline">DRAW</span><span className="hidden sm:inline">TEXT</span><span>SHAPE</span>
              </div>
              <span className="font-inter text-[10.5px] font-medium tabular-nums text-[#0A2044]/50">Canvas · 1280 × 720</span>
            </div>
          </SpringPanel>
          <SpringPanel
            label="inspector"
            strength={9}
            tilt={4}
            hoverScale={1.025}
            className="relative z-20 order-3 hidden rounded-[10px] border border-white/10 bg-[#0D2450] p-4 md:block lg:row-span-2"
          >
            <div className="flex items-center justify-between">
              <p className="font-inter text-[9.5px] font-medium uppercase tracking-[0.2em] text-white/35">Inspector</p>
              <span className="rounded-[4px] bg-[#F58232]/15 px-2 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F58232]">Live</span>
            </div>
            <div className="mt-2 border-b border-white/10 pb-3">
              <p className="font-inter text-[13px] font-semibold text-white/90">Sun — Layer 1</p>
              <p className="mt-0.5 font-inter text-[9.5px] text-white/35">vector · 240 x 240</p>
            </div>
            <div className="mt-3 space-y-3.5">
              {INSPECTOR.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-inter font-medium uppercase tracking-[0.1em] text-white/40">{f.label}</span>
                    <span className="font-inter tabular-nums text-white/75">{f.value}</span>
                  </div>
                  <div className="mt-2 h-[3px] rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#F58232]" style={{ width: `${f.slider}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[7px] border border-white/10 bg-white/[0.04] p-2.5">
              <p className="font-inter text-[9px] font-medium uppercase tracking-[0.16em] text-white/35">Easing</p>
              <div className="mt-2 flex gap-1.5">
                {["In", "Out", "Both"].map((e, i) => (
                  <span
                    key={e}
                    className={`flex-1 rounded-[4px] px-1 py-1.5 text-center font-inter text-[9.5px] font-semibold ${i === 2 ? "bg-white text-[#0A2044]" : "bg-white/[0.07] text-white/55"}`}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </SpringPanel>
          <SpringPanel
            label="timeline"
            strength={6}
            tilt={2}
            hoverScale={1.012}
            className="relative z-20 order-4 rounded-[10px] border border-white/10 bg-[#12305F] p-4 sm:p-5 lg:col-start-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F58232] text-[11px] text-white">▶</span>
                <span className="rounded-[4px] bg-white/[0.07] px-2.5 py-1.5 font-inter text-[11px] font-medium tabular-nums text-white/80">00:02:14</span>
                <span className="hidden font-inter text-[10px] font-medium uppercase tracking-[0.14em] text-white/35 sm:inline">Timeline</span>
              </div>
              <span className="font-inter text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">3 layers · 24fps</span>
            </div>
            <div aria-hidden="true" className="mt-4 flex justify-between font-inter text-[9px] font-medium tabular-nums text-white/25 sm:text-[10px]">
              <span>00:00</span><span>00:01</span><span>00:02</span><span>00:03</span><span>00:04</span><span>00:05</span>
            </div>
            <div className="relative mt-2 space-y-2.5">
              <div aria-hidden="true" className="playhead-anim absolute -top-5 bottom-0 z-10 w-px bg-[#F58232]">
                <span className="absolute -left-[4px] -top-[1px] h-[9px] w-[9px] rotate-45 rounded-[1px] bg-[#F58232]" />
              </div>
              {TRACKS.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="w-11 shrink-0 font-inter text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">{t.name}</span>
                  <div className="relative h-[26px] flex-1 rounded-[5px] bg-white/[0.05]">
                    {t.bars.map((b, i) => (
                      <div key={i} className="absolute top-[6px] h-[14px] rounded-[3px] opacity-90" style={{ left: b.l, width: b.w, background: t.color }} />
                    ))}
                    {t.keys.map((k) => (
                      <span key={k} className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-white/90" style={{ left: k }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SpringPanel>
        </div>
      </div>
    </div>
  );
}
     