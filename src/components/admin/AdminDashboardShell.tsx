"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type AdminSection = {
  id: string;
  label: string;
  /** Optional: entries without an icon show their label as text. */
  icon?: ComponentProps<typeof Icon>["name"];
  /** Optional sub-items shown as a dropdown. Each one's id is a hash like `${id}/…` and selects this section. */
  children?: { id: string; label: string }[];
  content: ReactNode;
};

/**
 * Full-viewport admin app: a dark midnight sidebar and a scrolling content
 * column. The active section is kept in the URL hash (#workshops,
 * #registrations/<id>…) so links, refresh and the back button all work. Every
 * section is rendered on the server; inactive ones are just hidden. The toggle
 * collapses the sidebar to icons only, which hides sub-items.
 */
export function AdminDashboardShell({ header, sections, footer }: { header: ReactNode; sections: AdminSection[]; footer?: ReactNode }) {
  const [hash, setHash] = useState("");
  const [open, setOpen] = useState(true);
  /** Dropdown state per section; unset means "open while this section is active". */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function syncFromHash() {
      setHash(window.location.hash.slice(1));
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const active = sections.find((s) => s.id === hash || hash.startsWith(`${s.id}/`))?.id ?? sections[0].id;

  return (
    // Fills the screen below the site header (promo bar 38px + header 68px / 76px on md+).
    <div className="flex h-[calc(100vh-106px)] overflow-hidden bg-canvas md:h-[calc(100vh-114px)]">
      <aside
        className={`flex h-full shrink-0 flex-col bg-midnight p-3 text-white shadow-[4px_0_24px_-12px_rgb(3_21_82/0.5)] transition-[width] duration-200 ${
          open ? "w-[232px]" : "w-[76px]"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          className={`mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-white transition-colors hover:bg-white/8 ${
            open ? "" : "justify-center"
          }`}
        >
          <Icon name="menu" size={20} />
          {open && <span className="text-[13px] font-semibold">Menu</span>}
        </button>
        <nav aria-label="Admin sections" className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {open && <p className="mb-2 px-3 text-[11px] font-bold tracking-[1.4px] text-white uppercase">Manage</p>}
          <ul className="grid gap-1">
            {sections.map((s) => {
              const current = s.id === active;
              const showLabel = open || !s.icon;
              const isOpen = expanded[s.id] ?? current;
              const hasChildren = Boolean(s.children?.length);
              return (
                <li key={s.id}>
                  <div className="flex min-w-0 items-center gap-1">
                    <a
                      href={`#${s.id}`}
                      aria-current={current && !hasChildren ? "page" : undefined}
                      title={showLabel ? undefined : s.label}
                      className={`relative flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                        current
                          ? "bg-white/12 text-white before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-orange"
                          : "hover:bg-white/8"
                      } ${open ? "" : "justify-center"}`}
                    >
                      {s.icon && <Icon name={s.icon} size={20} />}
                      <span className={showLabel ? "truncate" : "sr-only"}>{s.label}</span>
                    </a>
                    {open && hasChildren && (
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !isOpen }))}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Hide" : "Show"} ${s.label} list`}
                        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-white/8"
                      >
                        <Icon name="chevronDown" size={18} className={`transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {open && hasChildren && isOpen && (
                    <ul className="mt-1 mb-1 ml-[22px] grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 border-l border-white/15 pl-2.5">
                      {s.children?.map((c) => {
                        const selected = hash === c.id;
                        return (
                          <li key={c.id} className="min-w-0">
                            <a
                              href={`#${c.id}`}
                              aria-current={selected ? "page" : undefined}
                              title={c.label}
                              className={`block min-w-0 truncate rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                                selected ? "bg-white/12 font-semibold text-white" : "text-white/80 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              {c.label}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 md:px-10 md:py-10">
          {header}
          <div className="mt-8">
            {sections.map((s) => (
              <div key={s.id} hidden={s.id !== active}>
                {s.content}
              </div>
            ))}
          </div>
          {footer && <div className="mt-8 border-t border-line pt-5">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
