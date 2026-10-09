type SnakeStep = { number: string; title: string; description: string };

const BADGE_TONES = [
  "from-[#1450d6] to-[#18a8ee]",
  "from-[#f4690d] to-[#ffb02e]",
  "from-[#6d3fd6] to-[#b79cff]",
  "from-[#1b9aaa] to-[#18a8ee]",
  "from-[#34a334] to-[#7ed07e]",
];

const DOT_GRADIENT = "from-[#1450d6] via-[#18a8ee] to-[#f4690d]";

export function SnakeTimeline({ steps }: { steps: SnakeStep[] }) {
  return (
    <div>
      {/* Desktop snake — the path runs down the centre spine; cards
          alternate left / right with equal vertical rhythm. Each card
          carries its own number badge, and a short connector joins the
          card edge to the matching glowing dot on the spine. */}
      <ol
        className="relative mx-auto hidden max-w-[920px] list-none p-0 md:block"
        aria-label="How it works timeline"
      >
        {/* Centre spine */}
        <span
          className="absolute top-2 bottom-6 left-1/2 w-[4px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#1450d6] via-[#18a8ee] to-[#f4690d] opacity-30"
          aria-hidden="true"
        />
        {steps.map((step, index) => {
          const leftSide = index % 2 === 0;
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.number}
              className={`relative flex ${
                leftSide ? "justify-start" : "justify-end"
              } ${isLast ? "" : "pb-8"}`}
            >
              {/* Tiny solid gradient node on the spine */}
              <span
                className={`absolute top-9 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-gradient-to-br ${DOT_GRADIENT} shadow-[0_0_0_4px_rgb(255_255_255),0_0_12px_rgb(20_80_214/0.55)]`}
                aria-hidden="true"
              />

              {/* Card — badge + connector + content in one readable unit */}
              <article
                className={`relative w-[calc(50%-3.5rem)] rounded-[22px] border border-line bg-paper p-5 shadow-[0_8px_22px_rgb(20_60_160/0.06)] ${
                  leftSide ? "mr-auto" : "ml-auto"
                }`}
              >
                <span
                  className={`absolute top-[42px] hidden h-[3px] w-14 -translate-y-1/2 bg-gradient-to-r from-[#18a8ee] to-[#f4690d] opacity-50 md:block ${
                    leftSide ? "-right-14" : "-left-14"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`mb-3 inline-grid size-11 place-items-center rounded-[14px] bg-gradient-to-br text-[13px] font-black text-white ${BADGE_TONES[index % BADGE_TONES.length]}`}
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <h3 className="mb-1.5 font-display text-[17px] leading-[1.25] font-bold text-navy">
                  {step.title}
                </h3>
                <p className="text-[13px] leading-[1.7] text-muted">
                  {step.description}
                </p>
              </article>
            </li>
          );
        })}
      </ol>

      {/* Mobile — cards stack with equal gaps; connectors snake
          left / right so the flow stays visible on narrow screens */}
      <ol className="list-none space-y-0 p-0 md:hidden" aria-label="How it works timeline">
        {steps.map((step, index) => (
          <li key={step.number}>
            <div className="flex items-start gap-4 rounded-[22px] border border-line bg-paper p-5 shadow-[0_8px_22px_rgb(20_60_160/0.06)]">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br text-[13px] font-black text-white ${BADGE_TONES[index % BADGE_TONES.length]}`}
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div>
                <h3 className="mb-1.5 font-display text-[17px] leading-[1.25] font-bold text-navy">
                  {step.title}
                </h3>
                <p className="text-[13px] leading-[1.7] text-muted">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <svg
                className="mx-auto h-10 w-full max-w-[200px]"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={
                    index % 2 === 0
                      ? "M 50 0 C 50 13 82 12 82 20 C 82 28 50 27 50 40"
                      : "M 50 0 C 50 13 18 12 18 20 C 18 28 50 27 50 40"
                  }
                  fill="none"
                  stroke={index % 2 === 0 ? "#18a8ee" : "#f4690d"}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="1 7"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.7}
                />
              </svg>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
