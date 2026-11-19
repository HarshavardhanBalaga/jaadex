"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { AdminRegistrationRow } from "@/lib/kids-challenge/admin-service";
import { ADMIN_PAGE_LIMITS, type AdminRegistrationsQuery } from "@/lib/kids-challenge/admin-validation";
import { formatInr } from "@/lib/kids-challenge/analytics";
import { INDIAN_STATES, MAX_CLASS, MIN_CLASS } from "@/lib/kids-challenge/registration-validation";
import { RegistrationDetailDialog } from "./RegistrationDetailDialog";
import { KidsChallengeEmailComposer } from "./KidsChallengeEmailComposer";
import {
  downloadCsv,
  EmailStatusBadge,
  EmptyRow,
  ErrorRow,
  field,
  fmtDateTime,
  getAdminJson,
  LoadingRow,
  Pager,
  RegistrationStatusBadge,
  resendConfirmationEmail,
  resendMessage,
  secondaryButton,
  smallButton,
  type Pagination,
} from "./ui";

const SEARCH_DEBOUNCE_MS = 300;
const CLASSES = Array.from({ length: MAX_CLASS - MIN_CLASS + 1 }, (_, i) => MIN_CLASS + i);
const DEFAULT_QUERY: AdminRegistrationsQuery = { page: 1, limit: 25, q: "", payment: "all", studentClass: "all", state: "all", email: "all", sort: "createdAt", order: "desc" };

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
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  /** Ticked registrations, kept across pages and filters until sent or cleared. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);

  function toggleSelected(registrationId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  }

  async function resend(r: AdminRegistrationRow) {
    if (resendingId) return;
    setResendingId(r.id);
    setResendError(null);
    try {
      const status = await resendConfirmationEmail(r.id);
      setRows(
        (current) =>
          current?.map((row) =>
            row.id === r.id
              ? {
                  ...row,
                  emailStatus: status,
                  emailAttempts: row.emailAttempts + 1,
                  emailSentAt: status === "sent" ? new Date().toISOString() : row.emailSentAt,
                  emailError: status === "sent" ? null : row.emailError,
                }
              : row,
          ) ?? null,
      );
      if (status === "sent") onChanged(resendMessage(status, r.parentEmail));
      else setResendError(resendMessage(status, r.parentEmail));
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Could not resend the email. Try again.");
    } finally {
      setResendingId(null);
    }
  }

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
  const filtersActive = query.q !== "" || query.payment !== "all" || query.studentClass !== "all" || query.state !== "all" || query.email !== "all";

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
        <select aria-label="Confirmation email" value={query.email} onChange={(e) => update({ email: e.target.value as AdminRegistrationsQuery["email"] })} className={`${field} h-10`}>
          <option value="all">All emails</option>
          <option value="sent">Email sent</option>
          <option value="failed">Email failed</option>
          <option value="not_sent">Email not sent</option>
          <option value="pending">Email sending</option>
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
        <button type="button" onClick={() => setComposing(true)} className={`${secondaryButton} ml-auto`}>
          <Icon name="mail" size={16} />
          {selected.size > 0 ? `Email selected (${selected.size})` : "Email parents"}
        </button>
        <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={secondaryButton}>
          <Icon name={exporting ? "loader" : "download"} size={16} className={exporting ? "animate-spin" : ""} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {exportError && (
        <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
          {exportError}
        </p>
      )}
      {resendError && (
        <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
          {resendError}
        </p>
      )}
      {selected.size > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 border-b border-line bg-[#eef4ff] px-6 py-2.5 text-[13px] text-navy">
          <span className="font-semibold tabular-nums">
            {selected.size} selected
          </span>
          <button type="button" onClick={() => setSelected(new Set())} className="cursor-pointer font-semibold text-royal hover:underline">
            Clear selection
          </button>
        </div>
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
            <table className="w-full min-w-[1140px] text-left text-[14px]">
              <thead className="border-b border-line bg-[#f7f9fd] text-[12px] font-semibold tracking-[0.4px] text-[#2b3a63] uppercase">
                <tr>
                  <th className="w-12 py-3 pl-6">
                    <input
                      type="checkbox"
                      aria-label="Select all registrations on this page"
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      ref={(el) => {
                        if (el) el.indeterminate = !rows.every((r) => selected.has(r.id)) && rows.some((r) => selected.has(r.id));
                      }}
                      onChange={(e) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          for (const r of rows) {
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                          }
                          return next;
                        })
                      }
                      className="size-4 cursor-pointer accent-royal"
                    />
                  </th>
                  <SortHeader label="Student" sortKey="studentName" query={query} onSort={toggleSort} />
                  <th className="px-4 py-3">School / place</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Confirmation email</th>
                  <SortHeader label="Paid" sortKey="paidAt" query={query} onSort={toggleSort} />
                  <SortHeader label="Registered" sortKey="createdAt" query={query} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-b border-line transition-colors last:border-0 ${selected.has(r.id) ? "bg-[#eef4ff]" : "hover:bg-[#f7f9fd]"}`}>
                    <td className="py-3.5 pl-6 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.studentName}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelected(r.id)}
                        className="mt-1 size-4 cursor-pointer accent-royal"
                      />
                    </td>
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
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <EmailStatusBadge status={r.emailStatus} paid={r.paymentStatus === "paid"} sentAt={r.emailSentAt} error={r.emailError} attempts={r.emailAttempts} />
                        {r.paymentStatus === "paid" && r.emailStatus !== "pending" && (
                          <button
                            type="button"
                            onClick={() => void resend(r)}
                            disabled={resendingId !== null}
                            aria-label={`Resend confirmation email to ${r.parentEmail}`}
                            className={smallButton}
                          >
                            {resendingId === r.id && <Icon name="loader" size={13} className="animate-spin" />}
                            {resendingId === r.id ? "Sending…" : "Resend"}
                          </button>
                        )}
                      </div>
                      {r.emailStatus === "sent" && r.emailSentAt && <p className="mt-1 text-[12px] text-[#4a5a85]">{fmtDateTime(r.emailSentAt)}</p>}
                      {r.emailStatus === "failed" && r.emailError && <p className="mt-1 max-w-[220px] truncate text-[12px] text-[#a33d0c]" title={r.emailError}>{r.emailError}</p>}
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

      {composing && (
        <KidsChallengeEmailComposer
          selectedIds={[...selected]}
          onClose={() => setComposing(false)}
          onSent={(count) => {
            setComposing(false);
            setSelected(new Set());
            onChanged(`Email is being sent to ${count} parent${count === 1 ? "" : "s"}.`);
            // Delivery progress lives on the Emails tab.
            window.location.hash = "kids-challenge/emails";
          }}
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
