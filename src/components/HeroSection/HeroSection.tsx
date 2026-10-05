import AppMockup from "./AppMockup";
import ClipButton from "@/components/ui/ClipButton";
import ScrollScale from "./ScrollScale";

export default function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-white text-[#0A2044]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(10,32,68,0.06),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1600px] px-6 pt-14 sm:px-10 sm:pt-16 lg:px-14 lg:pt-20">
        <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
          <p
            className="hero-anim font-inter text-[12px] font-medium uppercase leading-none tracking-[0.24em] text-[#0A2044]/60 sm:text-[13px]"
            style={{ animationDelay: "0ms" }}
          >
            The future of classroom creativity
          </p>

          <h1
            id="hero-heading"
            className="hero-anim mt-7 font-display text-[clamp(56px,7vw,88px)] font-normal leading-[0.98] tracking-[-0.01em] text-[#0A2044]"
            style={{ animationDelay: "90ms" }}
          >
            <span className="block">Playful creation</span>
            <span className="block">over paper notes.</span>
          </h1>

          <p
            className="hero-anim mt-7 max-w-[640px] font-inter text-[17px] font-normal leading-[1.6] text-[#0A2044]/65 sm:text-[18px]"
            style={{ animationDelay: "180ms" }}
          >
            Bring lessons to life. Turn static school assignments into
            interactive animations with an easy-to-use desktop interface
            built directly for the web.
          </p>

          <div
            className="hero-anim mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center"
            style={{ animationDelay: "270ms" }}
          >
            <ClipButton href="#start" variant="primary" size="md">
              Start Animating Free
            </ClipButton>
            <ClipButton href="#schools" variant="secondary" size="md">
              Bring to Your School
              <span aria-hidden="true">
                →
              </span>
            </ClipButton>
          </div>
        </div>

        {/* ——— Large product application ——— */}
        <div className="relative mx-auto mt-14 w-full max-w-[1240px] pb-20 sm:mt-16 lg:mt-20 lg:pb-28">
          <ScrollScale>
            <AppMockup />
          </ScrollScale>
        </div>
      </div>
    </section>
  );
}

