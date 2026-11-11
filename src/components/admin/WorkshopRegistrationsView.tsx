"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/admin/Toast";
import type { WorkshopListItem } from "@/components/admin/WorkshopList";
import { WorkshopRegistrationsPanel } from "@/components/admin/WorkshopRegistrationsDialog";

const PREFIX = "registrations/";

/**
 * Dashboard section for one workshop at a time. The workshop comes from the URL hash
 * (#registrations/<id>, set by the sidebar dropdown); a bare #registrations shows the first one.
 */
export function WorkshopRegistrationsView({ workshops }: { workshops: WorkshopListItem[] }) {
  const [hash, setHash] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function syncFromHash() {
      setHash(window.location.hash.slice(1));
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  if (workshops.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-white px-6 py-14 text-center shadow-card">
        <p className="font-display text-[18px] font-bold text-navy">No workshops yet</p>
        <p className="mt-1.5 text-[14px] text-[#4a5a85]">Publish a workshop first, then its registrations will show up here.</p>
      </section>
    );
  }

  const requestedId = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : null;
  // Falls back to the first workshop if the link is missing or the workshop was removed.
  const selected = workshops.find((w) => w.id === requestedId) ?? workshops[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <WorkshopRegistrationsPanel key={selected.id} workshop={selected} onSaved={(message) => setToast(message)} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </section>
  );
}
