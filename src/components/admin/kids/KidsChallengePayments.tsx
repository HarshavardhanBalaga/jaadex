"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { AdminPaymentRow } from "@/lib/kids-challenge/admin-service";
import { ADMIN_PAGE_LIMITS, type AdminPaymentsQuery } from "@/lib/kids-challenge/admin-validation";
import { formatInr, methodLabel } from "@/lib/kids-challenge/analytics";
import { RegistrationDetailDialog } from "./RegistrationDetailDialog";
import { downloadCsv, EmptyRow, ErrorRow, field, fmtDateTime, getAdminJson, LoadingRow, Pager, PaymentStatusBadge, secondaryButton, type Pagination } from "./ui";

const SEARCH_DEBOUNCE_MS = 300;
type Query = Omit<AdminPaymentsQuery, "from" | "to"> & { from: string; to: string };
const DEFAULT_QUERY: Query = { page: 1, limit: 25, q: "", status: "all", method: "all", from: "", to: "", order: "desc" };
type Summary = { paid: number; failed: number; created: number; amountPaise: number };

/** Query string for the list and the export; empty dates are left out. */
function toParams(q: Query, withPaging: boolean): URLSearchParams {
  const params = new URLSearchParams();
  if (withPaging) {
    params.set("page", String(q.page));
    params.set("limit", String(q.limit));
    params.set("order", q.order);
  }
  if (q.q) params.set("q", q.q);
  params.set("status", q.status);
  params.set("method", q.method);
  if (q.from) params.set("from", q.from);
  if (q.to) params.set("to", q.to);
  return params;
}

/** Payment history: every Razorpay checkout, its outcome, method, fees and errors. */
export function KidsChallengePayments({ onChanged }: { onChanged: (message: string) => void }) {
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminPaymentRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
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
    let cancelled = false;
    getAdminJson<{ payments: AdminPaymentRow[]; summary: Summary; methods: string[]; pagination: Pagination }>(
      `/api/admin/kids-challenge/payments?${toParams(query, true)}`,
      "Could not load payment history.",
    ).then(
      (json) => {
        if (cancelled) return;
        setRows(json.payments);
        setSummary(json.summary);
        setMethods(json.methods);
        setPagination(json.pagination);
        setError(null);
        setLoadedKey(queryKey);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load payment history.");
        setLoadedKey(queryKey);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey captures every field of query.
  }, [queryKey, reloadToken]);

  function update(patch: Partial<Omit<Query, "page">>) {
    setQuery((c) => ({ ...c, ...patch, page: 1 }));
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCsv(`/api/admin/kids-challenge/payments/export?${toParams(query, false)}`, "kids-creative-challenge-payments.csv");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const loading = rows !== null && loadedKey !== queryKey;
  const filtersActive = query.q !== "" || query.status !== "all" || query.method !== "all" || query.from !== "" || query.to !== "";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search payments</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search student, parent, email, phone, order or payment ID"
            className={`${field} h-10 w-full`}
          />
        </label>
        <select aria-label="Status" value={query.status} onChange={(e) => update({ status: e.target.value as Query["status"] })} className={`${field} h-10`}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="created">No payment yet</option>
        </select>
        <select aria-label="Payment method" value={query.method} onChange={(e) => update({ method: e.target.value })} className={`${field} h-10`}>
          <option value="all">All methods</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {methodLabel(m)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13px] font-medium text-[#2b3a63]">
          From
          <input type="date" value={query.from} max={query.to || undefined} onChange={(e) => update({ from: e.target.value })} className={`${field} h-10`} />
        </label>
        <label className="flex items-center gap-2 text-[13px] font-medium text-[#2b3a63]">
          To
          <input type="date" value={query.to} min={query.from || undefined} onChange={(e) => update({ to: e.target.value })} className={`${field} h-10`} />
        </label>
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

      {summary && (
        <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
          {[
            { label: filtersActive ? "Collected (filtered)" : "Collected", value: formatInr(summary.amountPaise) },
            { label: "Paid", value: summary.paid.toLocaleString("en-IN") },
            { label: "Failed", value: summary.failed.toLocaleString("en-IN") },
            { label: "No payment yet", value: summary.created.toLocaleString("en-IN") },
          ].map((s) => (
            <div key={s.label} className="bg-white px-6 py-3">
              <dt className="text-[11px] font-bold tracking-[1px] text-muted uppercase">{s.label}</dt>
              <dd className="mt-0.5 font-display text-[18px] font-bold text-navy tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && rows === null ? (
        <ErrorRow message={error} onRetry={() => setReloadToken((n) => n + 1)} />
      ) : rows === null ? (
        <LoadingRow label="Loading payment history…" />
      ) : rows.length === 0 ? (
        <EmptyRow
          title={filtersActive ? "No payments match these filters" : "No payments yet"}
          hint={filtersActive ? "Try a different search, status or date range." : "Every order appears here as soon as a parent clicks Pay."}
        />
      ) : (
        <>
          {error && (
            <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
              {error}
            </p>
          )}
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <table className="w-full min-w-[1040px] text-left text-[14px]">
              <thead className="border-b border-line bg-[#f7f9fd] text-[12px] font-semibold tracking-[0.4px] text-[#2b3a63] uppercase">
                <tr>
                  <th className="px-4 py-3" aria-sort={query.order === "asc" ? "ascending" : "descending"}>
                    <button
                      type="button"
                      onClick={() => setQuery((c) => ({ ...c, order: c.order === "asc" ? "desc" : "asc", page: 1 }))}
                      className="inline-flex cursor-pointer items-center gap-1.5 uppercase text-royal hover:underline"
                    >
                      Started <span aria-hidden="true">{query.order === "asc" ? "↑" : "↓"}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3">Student / parent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Razorpay IDs</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-line align-top transition-colors last:border-0 hover:bg-[#f7f9fd]">
                    <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#2b3a63] tabular-nums">{fmtDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <button type="button" onClick={() => setOpenId(p.registrationId)} className="cursor-pointer text-left font-semibold break-words text-navy hover:text-royal hover:underline">
                        {p.studentName}
                      </button>
                      <p className="text-[#4a5a85]">{p.parentName}</p>
                      <p className="break-all text-[#4a5a85]">{p.parentEmail}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3.5 text-[13px] tabular-nums">
                      <p className="font-semibold text-navy">{formatInr(p.amountPaise)}</p>
                      {p.status === "paid" && <p className="text-[#4a5a85]">{p.feePaise === null ? "fee not reported yet" : `fee ${formatInr(p.feePaise)}`}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-navy">{p.method ? methodLabel(p.method) : "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-[#2b3a63]">
                      <p className="break-all">{p.orderId}</p>
                      <p className="break-all text-[#4a5a85]">{p.paymentId ?? "—"}</p>
                    </td>
                    <td className="max-w-[260px] px-4 py-3.5 text-[13px]">
                      {p.status === "paid" ? (
                        <p className="text-[#2b3a63]">Paid {fmtDateTime(p.paidAt)}</p>
                      ) : p.failedAttempts > 0 ? (
                        <p className="text-[#a33d0c]">
                          {p.failedAttempts} failed attempt{p.failedAttempts === 1 ? "" : "s"}
                          {p.errorDescription && <span className="block text-[#4a5a85]">{p.errorDescription}</span>}
                        </p>
                      ) : (
                        <p className="text-[#4a5a85]">Order created, no attempt recorded</p>
                      )}
                      {p.status === "paid" && p.failedAttempts > 0 && (
                        <p className="text-[#4a5a85]">
                          after {p.failedAttempts} failed attempt{p.failedAttempts === 1 ? "" : "s"}
                        </p>
                      )}
                    </td>
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
