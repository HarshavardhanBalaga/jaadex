import type { ReactNode } from "react";

interface AdminSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Titled panel used for every block on the admin dashboard. */
export function AdminSection({ id, title, subtitle, action, children }: AdminSectionProps) {
  return (
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
