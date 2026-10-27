"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type AdminSection = {
  id: string;
  label: string;
  /** Optional: entries without an icon show their label as text. */
  icon?: ComponentProps<typeof Icon>["name"];
  content: ReactNode;
};

/**
 * Full-viewport admin app: a sidebar pinned to the left edge and a scrolling
 * content column. The active section is kept in the URL hash (#workshops,
 * #enquiries…) so links, refresh and the back button all work. Every section
 * is rendered on the server; inactive ones are just hidden. The toggle
 * collapses the sidebar to icons only.
 */
export function AdminDashboardShell({ header, sections, footer }: { header: ReactNode; sections: AdminSection[]; footer?: ReactNode }) {
  const [active, setActive] = useState(sections[0].id);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    function syncFromHash() {
      const id = window.location.hash.slice(1);
      if (sections.some((s) => s.id === id)) setActive(id);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [sections]);

  return (
    // Fills the screen below the site header (promo bar 38px + header 68px / 76px on md+).
    <div className="flex h-[calc(100vh-106px)] overflow-hidden bg-[#f3f6fd] mr-4 md:h-[calc(100vh-114px)]">
      <aside
        className={`flex h-full shrink-0 flex-col border-r border-line bg-white p-3 transition-[width] duration-200 ${
          open ? "w-[220px]" : "w-[72px]"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          className={`mb-2 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-muted transition-colors hover:bg-[#eef3ff] hover:text-navy ${
            open ? "" : "justify-center"
          }`}
        >
          <Icon name="menu" size={20} />
          {open && <span className="text-[13px] font-semibold">Menu</span>}
        </button>
        <nav aria-label="Admin sections">
          <ul className="grid gap-1">
            {sections.map((s) => {
              const current = s.id === active;
              const showLabel = open || !s.icon;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={current ? "page" : undefined}
                    title={showLabel ? undefined : s.label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                      current ? "bg-royal text-white" : "text-muted hover:bg-[#eef3ff] hover:text-navy"
                    } ${open ? "" : "justify-center"}`}
                  >
                    {s.icon && <Icon name={s.icon} size={20} />}
                    <span className={showLabel ? "truncate" : "sr-only"}>{s.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="w-full max-w-[1180px] py-8 pr-8 pl-6 md:py-10 md:pr-12 md:pl-10">
          {header}
          <div className="mt-6">
            {sections.map((s) => (
              <div key={s.id} hidden={s.id !== active}>
                {s.content}
              </div>
            ))}
          </div>
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
