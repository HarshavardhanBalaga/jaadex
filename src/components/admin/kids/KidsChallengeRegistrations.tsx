"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { AdminRegistrationRow } from "@/lib/kids-challenge/admin-service";
import { ADMIN_PAGE_LIMITS, type AdminRegistrationsQuery } from "@/lib/kids-challenge/admin-validation";
import { formatInr } from "@/lib/kids-challenge/analytics";
import { INDIAN_STATES, MAX_CLASS, MIN_CLASS } from "@/lib/kids-challenge/registration-validation";
import { RegistrationDetailDialog } from "./RegistrationDetailDialog";
import { downloadCsv, EmptyRow, ErrorRow, field, fmtDateTime, getAdminJson, LoadingRow, Pager, RegistrationStatusBadge, secondaryButton, type Pagination } from "./ui";

const SEARCH_DEBOUNCE_MS = 300;
const CLASSES = Array.from({ length: MAX_CLASS - MIN_CLASS + 1 }, (_, i) => MIN_CLASS + i);
const DEFAULT_QUERY: AdminRegistrationsQuery = { page: 1, limit: 25, q: "", payment: "all", studentClass: "all", state: "all", sort: "createdAt", order: "desc" };

function SortHeader({ label, sortKey, query, onSort }: { label: string; sortKey: AdminRegistrationsQuery["sort"]; query: AdminRegistrationsQuery; onSort: (k: AdminRegistrationsQuery["sort"]) => void }) {
  const active = query.sort === sortKey;
  return (
    <th className="px-4 py-3" aria-sort={active ? (query.order === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(sortKey)} className={`inline-flex cursor-pointer items-center gap-1.5 uppercase hover:text-royal ${active ? "text-royal" : ""}`}>
        {label}
        <span aria-hidden="true">{active ? (query.order === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

/** Every registration: search, filter, sort, page, export; click a row for its details and payment history. */
export function KidsChallengeRegistrations({ onChanged }: { onChanged: (message: string) => void }) {
  const [query, setQuery] = useState<AdminRegistrationsQuery>(DEFAULT_QUERY);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminRegistrationRow[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((c) => (c.q === search.trim() ? c : { ...c, q: search.trim(), page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryKey = JSON.stringify(query);
  useEffect(() => {
    // Only the latest request may update the table: a slower, older response is dropped.
    let cancelled = false;
    const params = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
    getAdminJson<{ registrations: AdminRegistrationRow[]; pagination: Pagination }>(`/api/admin/kids-challenge/registrations?${params}`, "Could not load registrations.").then(
      (json) => {
        if (cancelled) return;
        setRows(json.registrations);
        setPagination(json.pagination);
        setError(null);
        setLoadedKey(queryKey);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load registrations.");
        setLoadedKey(queryKey);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey captures every field of query.
  }, [queryKey, reloadToken]);

  function update(patch: Partial<Omit<AdminRegistrationsQuery, "page">>) {
    setQuery((c) => ({ ...c, ...patch, page: 1 }));
  }

  function toggleSort(sort: AdminRegistrationsQuery["sort"]) {
    setQuery((c) => ({ ...c, sort, order: c.sort === sort ? (c.order === "asc" ? "desc" : "asc") : sort === "studentName" ? "asc" : "desc", page: 1 }));
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv("/api/kids-challenge/registrations/export", "kids-creative-challenge-registrations.csv");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const loading = rows !== null && loadedKey !== queryKey;
  const filtersActive = query.q !== "" || query.payment !== "all" || query.studentClass !== "all" || query.state !== "all";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search registrations</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search student, parent, email, phone, school, payment ID"
            className={`${field} h-10 w-full`}
          />
        </label>
        <select aria-label="Payment status" value={query.payment} onChange={(e) => update({ payment: e.target.value as AdminRegistrationsQuery["payment"] })} className={`${field} h-10`}>
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Payment pending</option>
        </select>
        <select
          aria-label="Class"
          value={String(query.studentClass)}
          onChange={(e) => update({ studentClass: e.target.value === "all" ? "all" : Number(e.target.value) })}
          className={`${field} h-10`}
        >
          <option value="all">All classes</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
        <select aria-label="State" value={query.state} onChange={(e) => update({ state: e.target.value as AdminRegistrationsQuery["state"] })} className={`${field} h-10 max-w-[200px]`}>
          <option value="all">All states</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setQuery(DEFAULT_QUERY);
            }}
            className="h-10 cursor-pointer px-2 text-[13px] font-semibold text-royal hover:underline"
          >
            Clear filters
          </button>
        )}
        <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={`${secondaryButton} ml-auto`}>
          <Icon name={exporting ? "loader" : "download"} size={16} className={exporting ? "animate-spin" : ""} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {exportError && (
        <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
          {exportError}
        </p>
      )}

      {error && rows === null ? (
        <ErrorRow message={error} onRetry={() => setReloadToken((n) => n + 1)} />
      ) : rows === null ? (
        <LoadingRow label="Loading registrations…" />
      ) : rows.length === 0 ? (
        <EmptyRow
          title={filtersActive ? "No registrations match these filters" : "No registrations yet"}
          hint={filtersActive ? "Try a different search or filter." : "Registrations appear here as parents sign up."}
        />
      ) : (
        <>
          {error && (
            <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
              {error}
            </p>
          )}
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <table className="w-full min-w-[980px] text-left text-[14px]">
              <thead className="border-b border-line bg-[#f7f9fd] text-[12px] font-semibold tracking-[0.4px] text-[#2b3a63] uppercase">
                <tr>
                  <SortHeader label="Student" sortKey="studentName" query={query} onSort={toggleSort} />
                  <th className="px-4 py-3">School / place</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Payment</th>
                  <SortHeader label="Paid" sortKey="paidAt" query={query} onSort={toggleSort} />
                  <SortHeader label="Registered" sortKey="createdAt" query={query} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-[#f7f9fd]">
                    <td className="px-4 py-3.5">
                      <button type="button" onClick={() => setOpenId(r.id)} className="cursor-pointer text-left font-semibold break-words text-navy hover:text-royal hover:underline">
                        {r.studentName}
                      </button>
                      <p className="text-[13px] text-[#4a5a85]">
                        Class {r.studentClass} · Age {r.studentAge}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <p className="break-words text-navy">{r.schoolName}</p>
                      <p className="text-[#4a5a85]">
                        {r.city}, {r.state}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <p className="text-navy">{r.parentName}</p>
                      <a href={`mailto:${r.parentEmail}`} className="block break-all text-[#4a5a85] hover:text-royal">
                        {r.parentEmail}
                      </a>
                      <a href={`tel:+91${r.parentPhone}`} className="block text-[#4a5a85] hover:text-royal">
                        {r.parentPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <RegistrationStatusBadge status={r.paymentStatus} />
                      <p className="mt-1 text-[12px] text-[#4a5a85] tabular-nums">{formatInr(r.amountPaise)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#2b3a63] tabular-nums">{fmtDateTime(r.paidAt)}</td>
                    <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#2b3a63] tabular-nums">{fmtDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pagination && (
        <Pager
          pagination={pagination}
          loading={loading}
          limits={ADMIN_PAGE_LIMITS}
          onPage={(page) => setQuery((c) => ({ ...c, page }))}
          onLimit={(limit) => update({ limit })}
        />
      )}

      {openId && (
        <RegistrationDetailDialog
          registrationId={openId}
          onClose={() => setOpenId(null)}
          onChanged={(message) => {
            onChanged(message);
            setReloadToken((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
