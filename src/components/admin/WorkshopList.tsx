"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";

export type WorkshopListItem = {
  id: string;
  title: string;
  description: string;
  date: string; // ISO
  location: string;
  image: string; // data URL
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

/** Dashboard list of published workshops with delete. Server data, client actions. */
export function WorkshopList({ workshops }: { workshops: WorkshopListItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!window.confirm("Remove this workshop from the calendar?")) return;
    setBusyId(id);
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
      });
      if (!res.ok) throw new Error("Could not remove the workshop. Try again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (workshops.length === 0) {
    return <p className="px-5 py-6 text-[13px] text-muted">No workshops published yet. Open “Publish workshop” under Actions to add one.</p>;
  }

  return (
    <div className="divide-y divide-line">
      {error && <p className="px-5 py-3 text-[13px] text-muted">{error}</p>}
      {workshops.map((w) => (
        <div key={w.id} className="flex items-center gap-4 px-5 py-4">
          {/* Data-URL image: plain img (next/image does not accept data: URLs). */}
          <img src={w.image} alt={w.title} className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover" />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[14px] font-semibold text-navy">{w.title}</h4>
            <p className="mt-0.5 text-[12px] text-muted">
              {fmtDate(w.date)} · {w.location}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onDelete(w.id)}
            disabled={busyId === w.id}
            className="shrink-0 cursor-pointer rounded-lg border border-line px-3.5 py-1.5 text-[12px] text-muted transition-colors hover:border-navy/30 hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyId === w.id ? "Removing…" : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}