"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { WorkshopFormRow } from "@/lib/workshop-forms/service";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function isOnline(location: string): boolean {
  return /\bonline\b/i.test(location);
}

function FormStatus({ hasForm, updatedAt }: { hasForm: boolean; updatedAt: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-navy">
        <span className={`size-2 rounded-full ${hasForm ? "bg-green" : "bg-line"}`} aria-hidden="true" />
        {hasForm ? "Form Created" : "No Form Yet"}
      </span>
      {hasForm && updatedAt && <span className="text-[12px] text-muted">Last edited {fmtDate(updatedAt)}</span>}
    </div>
  );
}

/**
 * Searchable list of every workshop with its form status. The rows come from the
 * server, so a newly published workshop appears here without any code change.
 */
export function WorkshopFormsTable({ rows }: { rows: WorkshopFormRow[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f5f8ff] px-5 py-4">
        <h2 className="font-display text-[16px] font-bold text-navy">All workshops</h2>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search workshops</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or location"
            className="w-full rounded-xl border border-[#8d9bc4] bg-white px-4 py-2.5 text-[14px] text-navy outline-none placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-muted">No workshops available yet.</p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-muted">No workshops match “{query.trim()}”.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-b border-line text-[12px] font-semibold text-navy">
              <tr>
                <th className="px-5 py-3">Workshop</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Form status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[#f5f8ff]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Data-URL image: plain img (next/image does not accept data: URLs). */}
                      <img src={r.image} alt="" className="h-12 w-16 shrink-0 rounded-lg border border-line object-cover" />
                      <span className="line-clamp-2 max-w-[260px] font-semibold text-navy">{r.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-navy">{fmtDate(r.date)}</td>
                  <td className="px-5 py-4">
                    {isOnline(r.location) ? (
                      <span className="inline-flex rounded-full bg-[#e9efff] px-2.5 py-0.5 text-[12px] font-semibold text-royal">Online</span>
                    ) : (
                      <span className="text-navy">{r.location}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <FormStatus hasForm={r.hasForm} updatedAt={r.formUpdatedAt} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/forms/${r.id}`}
                      className={`inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                        r.hasForm
                          ? "border border-navy text-navy hover:bg-navy hover:text-white"
                          : "bg-royal text-white hover:bg-royal-dark"
                      }`}
                    >
                      {r.hasForm ? "Edit Form" : "Create Form"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
