export type Step = { title: string; description: string };

export function StepGrid({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-1 gap-[15px] min-[461px]:grid-cols-2 md:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-[22px] border border-line bg-paper p-[22px] shadow-[0_8px_22px_rgb(20_60_160/0.03)]">
          <span className="grid size-[42px] place-items-center rounded-[14px] bg-[#ffe0cc] text-[13px] font-black text-[#a3410a]" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-[17px] mb-2 text-[17px] leading-[1.25] font-bold text-navy">{step.title}</h3>
          <p className="text-[13px] leading-[1.7] text-muted">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
