"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";
import { WorkshopEmailComposer } from "@/components/admin/WorkshopEmailComposer";
import type { WorkshopListItem } from "@/components/admin/WorkshopList";
import {
  fieldErrorsOf,
  MAX_CAPACITY,
  REGISTRATION_PAGE_LIMITS,
  registrationSettingsSchema,
  type RegistrationListQuery,
} from "@/lib/workshops/registration-validation";
import { formatBytes } from "@/lib/workshops/attachment-rules";

type EmailStatus = "pending" | "sent" | "failed" | "skipped";

/** An admin-written email and its per-recipient delivery (GET /api/workshops/[id]/emails). */
type SentEmail = {
  id: string;
  subject: string;
  message: string;
  audience: "all" | "selected";
  sentBy: string;
  createdAt: string;
  counts: { sent: number; failed: number; sending: number };
  attachments: { filename: string; size: number }[];
  recipients: { registrationId: string; name: string; email: string; status: EmailStatus | "sending"; attempts: number; sentAt: string | null; lastError: string | null }[];
};

/** How often the history refreshes while an email is still going out. */
const POLL_MS = 3000;
const SEARCH_DEBOUNCE_MS = 300;

type Pagination = { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };

const EMAIL_FILTER_OPTIONS: { value: RegistrationListQuery["email"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "not_sent", label: "Not sent" },
  { value: "pending", label: "Sending" },
];

async function fetchSentEmails(workshopId: string): Promise<SentEmail[]> {
  const res = await authFetch(`/api/workshops/${workshopId}/emails`);
  const json = (await res.json().catch(() => null)) as { emails?: SentEmail[]; error?: { message?: string } } | null;
  if (!res.ok || !json?.emails) throw new Error(json?.error?.message ?? "Could not load sent emails.");
  return json.emails;
}

type Registration = {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  emailStatus: EmailStatus | null; // null = registered before email tracking existed
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
};

/** Failed, never sent (no SMTP) and untracked emails can be resent; sent and in-flight ones can't. */
function canResend(status: EmailStatus | null): boolean {
  return status === null || status === "failed" || status === "skipped";
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Two-letter initials for the name avatar, e.g. "Asha Rao" → "AR". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "");
  return letters.toUpperCase() || "?";
}

const primaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-royal px-4 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#8d9bc4] bg-white px-4 text-[14px] font-semibold text-navy transition-colors hover:border-royal hover:text-royal disabled:cursor-not-allowed disabled:opacity-50";
const smallButton =
  "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#e0a27f] bg-white px-3 text-[13px] font-semibold text-[#a33d0c] transition-colors hover:bg-[#fdf1ea] disabled:cursor-not-allowed disabled:opacity-50";
const pageButton =
  "inline-flex h-8 cursor-pointer items-center px-3 text-[13px] font-semibold text-[#2b3a63] transition-colors hover:bg-[#f5f8ff] hover:text-royal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#2b3a63]";
/** Text input and select used by the search, seat limit and page size. Size is set by each use. */
const field =
  "rounded-lg border border-[#8d9bc4] bg-white px-3 text-[14px] text-navy outline-none transition-[border-color,box-shadow] placeholder:text-[#7a88ad] hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:opacity-70";

/** Column header that sorts the list on the server; clicking again flips the order. */
function SortableHeader({
  label,
  field,
  query,
  onSort,
}: {
  label: string;
  field: RegistrationListQuery["sort"];
  query: RegistrationListQuery;
  onSort: (field: RegistrationListQuery["sort"]) => void;
}) {
  const active = query.sort === field;
  return (
    <th className="px-4 py-3" aria-sort={active ? (query.order === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex cursor-pointer items-center gap-1.5 hover:text-royal ${active ? "text-royal" : ""}`}
      >
        {label}
        <span aria-hidden="true">{active ? (query.order === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

/** Delivery status of one email, used for the table and for each email's recipients. */
function EmailStatusBadge({
  status,
  sentAt,
  error,
  attempts,
}: {
  status: EmailStatus | "sending" | null;
  sentAt: string | null;
  error: string | null;
  attempts: number;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap";
  if (status === "sent") {
    return (
      <span className={`${base} bg-[#e3f4e3] text-[#1d6b1d]`} title={sentAt ? `Sent ${fmt(sentAt)}` : undefined}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#1d6b1d]" />
        Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={`${base} bg-[#fdece4] text-[#a33d0c]`} title={error ? `${error} (${attempts} attempt${attempts === 1 ? "" : "s"})` : undefined}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#a33d0c]" />
        Failed
      </span>
    );
  }
  if (status === "pending" || status === "sending") {
    return (
      <span className={`${base} bg-[#e9efff] text-royal`}>
        <Icon name="loader" size={12} className="animate-spin" />
        Sending
      </span>
    );
  }
  return (
    <span className={`${base} bg-[#eef1f8] text-[#3d4a6b]`} title={error ?? "Registered before confirmation emails were added."}>
      Not sent
    </span>
  );
}

type MenuItem = { label: string; onSelect: () => void; disabled?: boolean };

/** One "Actions" menu for the workshop, so the page itself stays uncluttered. */
function ActionsMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className={secondaryButton}>
        Actions
        <Icon name="chevronDown" size={16} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-soft">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="block w-full cursor-pointer px-4 py-2.5 text-left text-[14px] font-medium text-navy transition-colors hover:bg-[#f0f4fb] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Seat limit, registrants, and emails for one workshop. Used on the dashboard's Registrations section. */
export function WorkshopRegistrationsPanel({ workshop, onSaved }: { workshop: WorkshopListItem; onSaved: (message: string) => void }) {
  const router = useRouter();
  const id = useId();
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState<RegistrationListQuery>({ page: 1, limit: 10, q: "", email: "all", sort: "createdAt", order: "desc" });
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  /** The query the table currently shows; differs from `query` while the next page loads. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(workshop.registration.capacity === null ? "" : String(workshop.registration.capacity));
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  const [emails, setEmails] = useState<SentEmail[] | null>(null);
  const [emailsError, setEmailsError] = useState<string | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const busy = saving || isRefreshing;

  const loadEmails = useCallback(
    () =>
      fetchSentEmails(workshop.id).then(
        (list) => {
          setEmails(list);
          setEmailsError(null);
        },
        (err: unknown) => setEmailsError(err instanceof Error ? err.message : "Could not load sent emails."),
      ),
    [workshop.id],
  );

  useEffect(() => {
    let cancelled = false;
    fetchSentEmails(workshop.id).then(
      (list) => {
        if (!cancelled) setEmails(list);
      },
      (err: unknown) => {
        if (!cancelled) setEmailsError(err instanceof Error ? err.message : "Could not load sent emails.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [workshop.id]);

  // Refresh while any email is still going out, so the counts update on their own.
  const stillSending = emails?.some((e) => e.counts.sending > 0) ?? false;
  useEffect(() => {
    if (!stillSending) return;
    const timer = window.setTimeout(() => void loadEmails(), POLL_MS);
    return () => window.clearTimeout(timer);
  }, [stillSending, emails, loadEmails]);

  function toggleSelected(registrationId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  }

  async function retryEmail(email: SentEmail) {
    if (retryingId) return;
    setRetryingId(email.id);
    setEmailsError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${workshop.id}/emails/${email.id}/retry`, {
        method: "POST",
        headers: { "x-csrf-token": csrf },
      });
      const json = (await res.json().catch(() => null)) as { queued?: number; error?: { message?: string } } | null;
      if (!res.ok || typeof json?.queued !== "number") throw new Error(json?.error?.message ?? "Could not retry. Try again.");
      onSaved(`Retrying ${json.queued} recipient${json.queued === 1 ? "" : "s"} of “${email.subject}”.`);
      await loadEmails();
    } catch (err) {
      setEmailsError(err instanceof Error ? err.message : "Could not retry. Try again.");
    } finally {
      setRetryingId(null);
    }
  }

  // Search waits until typing pauses, then starts again from page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) => (current.q === search.trim() ? current : { ...current, q: search.trim(), page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryKey = JSON.stringify(query);
  useEffect(() => {
    // Only the latest request may update the table: an older, slower response is dropped.
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
          q: query.q,
          email: query.email,
          sort: query.sort,
          order: query.order,
        });
        const res = await authFetch(`/api/workshops/${workshop.id}/registrations?${params}`);
        const json = (await res.json().catch(() => null)) as {
          registrations?: Registration[];
          pagination?: Pagination;
          error?: { message?: string };
        } | null;
        if (!res.ok || !json?.registrations || !json.pagination) throw new Error(json?.error?.message ?? "Could not load registrations. Try again.");
        if (cancelled) return;
        setRows(json.registrations);
        setPagination(json.pagination);
        setLoadError(null);
        setLoadedKey(queryKey);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load registrations. Try again.");
        setLoadedKey(queryKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workshop.id, queryKey, query.page, query.limit, query.q, query.email, query.sort, query.order]);

  /** Change filters, sort or page size: always back to page 1. */
  function updateQuery(patch: Partial<Omit<RegistrationListQuery, "page">>) {
    setQuery((current) => ({ ...current, ...patch, page: 1 }));
  }

  function toggleSort(field: RegistrationListQuery["sort"]) {
    setQuery((current) => ({
      ...current,
      sort: field,
      // Same column flips the order; a new column starts with the most useful direction.
      order: current.sort === field ? (current.order === "asc" ? "desc" : "asc") : field === "name" ? "asc" : "desc",
      page: 1,
    }));
  }

  async function saveCapacity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = capacity.trim();
    const settings = { enabled: workshop.registration.enabled, capacity: trimmed === "" ? null : Number(trimmed) };
    // Same schema as the server: catch mistakes before a round trip.
    const checked = registrationSettingsSchema.safeParse(settings);
    if (!checked.success) {
      setCapacityError(fieldErrorsOf(checked.error).capacity?.[0] ?? "Enter a valid number of seats.");
      return;
    }
    setCapacityError(null);
    setSaving(true);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${workshop.id}/registration`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(checked.data),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: { message?: string; fields?: Record<string, string[] | undefined> } } | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.fields?.capacity?.[0] ?? json?.error?.message ?? "Could not save the seat limit. Try again.");
      }
      startRefresh(() => {
        router.refresh();
        setSeatOpen(false);
        onSaved(checked.data.capacity === null ? "Seat limit removed." : `Seat limit set to ${checked.data.capacity}.`);
      });
    } catch (err) {
      setCapacityError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function resendEmail(r: Registration) {
    if (resendingId) return;
    setResendingId(r.id);
    setResendError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${workshop.id}/registrations/${r.id}/resend-email`, {
        method: "POST",
        headers: { "x-csrf-token": csrf },
      });
      const json = (await res.json().catch(() => null)) as { status?: EmailStatus; error?: { message?: string } } | null;
      if (!res.ok || !json?.status) throw new Error(json?.error?.message ?? "Could not resend the email. Try again.");
      const status = json.status;
      setRows((current) =>
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
      if (status === "failed") setResendError(`Sending to ${r.email} failed again. Check the email settings and try later.`);
      if (status === "skipped") setResendError("Email is not configured on the server (SMTP), so nothing was sent.");
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setResendingId(null);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      // authFetch (not a plain link) so an expired access token is refreshed first.
      const res = await authFetch(`/api/workshops/${workshop.id}/registrations/export`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(json?.error?.message ?? "Could not export. Try again.");
      }
      const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "registrations.csv";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const { count } = workshop.registration;
  // Previous rows stay on screen (dimmed) while the next page loads.
  const pageLoading = rows !== null && loadedKey !== queryKey;
  const allOnPageSelected = rows !== null && rows.length > 0 && rows.every((r) => selected.has(r.id));
  const filtersActive = query.q !== "" || query.email !== "all";
  const capacityNumber = workshop.registration.capacity;

  return (
    <>
      {/* Header: which workshop this is, and one menu for everything you can do with it. */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <p className="text-[12px] font-bold tracking-[1.2px] text-[#4a5a85] uppercase">Registrations</p>
          <h2 className="mt-1 font-display text-[20px] font-bold break-words text-navy">{workshop.title}</h2>
          <p className="mt-1 text-[14px] text-[#2b3a63]">
            <span className="font-semibold text-navy tabular-nums">{count}</span> registered
            {capacityNumber !== null && ` of ${capacityNumber} seats`}
          </p>
        </div>
        <ActionsMenu
          items={[
            { label: "Seat limit", onSelect: () => setSeatOpen(true) },
            { label: exporting ? "Exporting…" : "Download list", onSelect: () => void exportCsv(), disabled: exporting || count === 0 },
            {
              label: selected.size > 0 ? `Email selected (${selected.size})` : "Email registrants",
              onSelect: () => setComposing(true),
              disabled: count === 0 && selected.size === 0,
            },
          ]}
        />
      </div>
      {exportError && <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">{exportError}</p>}

      {seatOpen && (
        <Modal labelledBy={`${id}-seat-heading`} busy={busy} dismissOnBackdrop className="max-w-[420px]" onClose={() => setSeatOpen(false)}>
          <form onSubmit={saveCapacity} noValidate className="grid gap-4 p-6">
            <div>
              <h3 id={`${id}-seat-heading`} className="font-display text-[18px] font-bold text-navy">
                Seat limit
              </h3>
              <p className="mt-1 text-[13px] text-[#4a5a85]">Leave empty for no limit. Registration closes by itself when every seat is taken.</p>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-capacity`} className="text-[13px] font-semibold text-navy">
                Maximum seats
              </label>
              <input
                id={`${id}-capacity`}
                type="number"
                inputMode="numeric"
                min={Math.max(1, count)}
                max={MAX_CAPACITY}
                step={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="No limit"
                disabled={busy}
                aria-invalid={Boolean(capacityError)}
                className={`${field} h-10 w-full`}
              />
              {capacityError && (
                <p role="alert" className="text-[13px] font-medium text-[#a33d0c]">
                  {capacityError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2.5">
              <button type="button" onClick={() => setSeatOpen(false)} disabled={busy} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy && <Icon name="loader" size={16} className="animate-spin" />}
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Find people and filter by email status. */}
      {count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <label className="relative w-full max-w-[300px]">
            <span className="sr-only">Search registrants</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              placeholder="Search by name, email or phone"
              className={`${field} h-10 w-full`}
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#2b3a63]">
            Confirmation email
            <select
              value={query.email}
              onChange={(e) => updateQuery({ email: e.target.value as RegistrationListQuery["email"] })}
              className={`${field} h-10`}
            >
              {EMAIL_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {resendError && <p role="alert" className="px-6 pb-3 text-[13px] font-medium text-[#a33d0c]">{resendError}</p>}

      {/* Registrants. */}
      {loadError ? (
        <p role="alert" className="px-6 py-12 text-center text-[14px] font-medium text-[#a33d0c]">
          {loadError}
        </p>
      ) : rows === null ? (
        <p className="flex items-center justify-center gap-2 px-6 py-12 text-[14px] text-[#4a5a85]" role="status">
          <Icon name="loader" size={16} className="animate-spin" /> Loading registrants…
        </p>
      ) : rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-navy">{filtersActive ? "No one matches these filters" : "No one has registered yet"}</p>
          <p className="mt-1 text-[13px] text-[#4a5a85]">
            {filtersActive ? "Try a different name or filter." : "Sign-ups will appear here as people register."}
          </p>
        </div>
      ) : (
        <div className={`overflow-x-auto transition-opacity ${pageLoading ? "opacity-60" : ""}`} aria-busy={pageLoading}>
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-y border-line bg-[#f7f9fd] text-[12px] font-semibold tracking-[0.4px] text-[#2b3a63] uppercase">
              <tr>
                <th className="w-12 py-3 pl-6">
                  <input
                    type="checkbox"
                    aria-label="Select all registrants on this page"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPageSelected && rows.some((r) => selected.has(r.id));
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
                <SortableHeader label="Name" field="name" query={query} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Contact</th>
                <SortableHeader label="Registered" field="createdAt" query={query} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Confirmation email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-line transition-colors last:border-0 ${selected.has(r.id) ? "bg-[#eef4ff]" : "hover:bg-[#f7f9fd]"}`}
                >
                  <td className="py-3.5 pl-6">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelected(r.id)}
                      className="size-4 cursor-pointer accent-royal"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-royal/10 text-[13px] font-bold text-royal">
                        {initials(r.name)}
                      </span>
                      <span className="font-semibold text-navy break-words">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <a href={`mailto:${r.email}`} className="block text-navy break-all hover:text-royal">
                      {r.email}
                    </a>
                    <a href={`tel:${r.phone}`} className="mt-0.5 block text-[13px] whitespace-nowrap text-[#4a5a85] hover:text-royal">
                      {r.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#2b3a63] tabular-nums">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <EmailStatusBadge status={r.emailStatus} sentAt={r.emailSentAt} error={r.emailError} attempts={r.emailAttempts} />
                      {canResend(r.emailStatus) && (
                        <button
                          type="button"
                          onClick={() => void resendEmail(r)}
                          disabled={resendingId !== null}
                          aria-label={`Resend confirmation email to ${r.email}`}
                          className={smallButton}
                        >
                          {resendingId === r.id && <Icon name="loader" size={13} className="animate-spin" />}
                          {resendingId === r.id ? "Sending…" : "Resend"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paging. */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-line px-6 py-3">
          <p role="status" className="text-[13px] text-[#2b3a63]">
            Showing{" "}
            <span className="font-semibold text-navy tabular-nums">
              {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-navy tabular-nums">{pagination.total}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#2b3a63]">
              Rows
              <select value={query.limit} onChange={(e) => updateQuery({ limit: Number(e.target.value) })} className={`${field} h-8 px-2 text-[13px]`}>
                {REGISTRATION_PAGE_LIMITS.filter((n) => n <= 50).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#8d9bc4] bg-white">
              <button
                type="button"
                onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                disabled={!pagination.hasPrevPage || pageLoading}
                aria-label="Previous page"
                className={pageButton}
              >
                ← Prev
              </button>
              <span className="border-x border-line px-3 text-[13px] font-semibold whitespace-nowrap text-navy tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                disabled={!pagination.hasNextPage || pageLoading}
                aria-label="Next page"
                className={pageButton}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emails sent: a plain list, details open on demand. */}
      <section aria-labelledby={`${id}-emails`} className="border-t border-line px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`${id}-emails`} className="font-display text-[17px] font-bold text-navy">
            Emails sent
          </h3>
          <p className="text-[13px] text-[#4a5a85]">Every message you have sent to registrants, and how each one went.</p>
        </div>

        {emailsError && (
          <p role="alert" className="mt-3 text-[13px] font-medium text-[#a33d0c]">
            {emailsError}
          </p>
        )}
        {emails === null ? (
          !emailsError && (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-[#4a5a85]" role="status">
              <Icon name="loader" size={14} className="animate-spin" /> Loading…
            </p>
          )
        ) : emails.length === 0 ? (
          <p className="mt-3 text-[14px] text-[#4a5a85]">Nothing sent yet. Use “Email registrants” to send an update.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {emails.map((e) => {
              const expanded = expandedEmailId === e.id;
              return (
                <li key={e.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-navy">{e.subject}</p>
                      <p className="mt-0.5 text-[13px] text-[#4a5a85]">
                        {fmt(e.createdAt)} · by {e.sentBy} · {e.audience === "all" ? "all registrants" : "selected registrants"}
                        {e.attachments.length > 0 && ` · ${e.attachments.length} attachment${e.attachments.length === 1 ? "" : "s"}`}
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] font-medium">
                        <span className="text-[#1d6b1d]">{e.counts.sent} sent</span>
                        {e.counts.failed > 0 && <span className="text-[#a33d0c]">{e.counts.failed} not delivered</span>}
                        {e.counts.sending > 0 && <span className="text-royal">{e.counts.sending} sending</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.counts.failed > 0 && (
                        <button type="button" onClick={() => void retryEmail(e)} disabled={retryingId !== null} className={smallButton}>
                          {retryingId === e.id && <Icon name="loader" size={13} className="animate-spin" />}
                          {retryingId === e.id ? "Retrying…" : "Retry failed"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedEmailId(expanded ? null : e.id)}
                        aria-expanded={expanded}
                        className="h-8 cursor-pointer rounded-lg px-3 text-[13px] font-semibold text-royal transition-colors hover:bg-royal/10"
                      >
                        {expanded ? "Hide details" : "View details"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 grid gap-4 border-l-2 border-royal/30 pl-4">
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-[#2b3a63]">{e.message}</p>
                      {e.attachments.length > 0 && (
                        <p className="text-[13px] text-[#4a5a85]">
                          Attached: {e.attachments.map((a) => `${a.filename} (${formatBytes(a.size)})`).join(", ")}
                        </p>
                      )}
                      <ul className="divide-y divide-line">
                        {e.recipients.map((r) => (
                          <li key={r.registrationId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
                            <span className="min-w-0 break-all">
                              <span className="font-semibold text-navy">{r.name}</span> <span className="text-[#4a5a85]">{r.email}</span>
                            </span>
                            <EmailStatusBadge status={r.status} sentAt={r.sentAt} error={r.lastError} attempts={r.attempts} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {composing && rows && (
        <WorkshopEmailComposer
          workshopId={workshop.id}
          workshopTitle={workshop.title}
          selectedIds={[...selected]}
          totalRegistrants={count}
          onClose={() => setComposing(false)}
          onSent={(recipientCount) => {
            setComposing(false);
            setSelected(new Set());
            onSaved(`Email is being sent to ${recipientCount} registrant${recipientCount === 1 ? "" : "s"}.`);
            void loadEmails();
          }}
        />
      )}
    </>
  );
}
