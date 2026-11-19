"use client";

import type { ReactNode } from "react";
import { authFetch, getCsrfToken } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";

/** Shared look for the Kids Challenge admin section; matches the workshop registrations panel. */
export const primaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-royal px-4 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#8d9bc4] bg-white px-4 text-[14px] font-semibold text-navy transition-colors hover:border-royal hover:text-royal disabled:cursor-not-allowed disabled:opacity-50";
export const field =
  "rounded-lg border border-[#8d9bc4] bg-white px-3 text-[14px] text-navy outline-none transition-[border-color,box-shadow] placeholder:text-[#7a88ad] hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:opacity-70";
const pageButton =
  "inline-flex h-8 cursor-pointer items-center px-3 text-[13px] font-semibold text-[#2b3a63] transition-colors hover:bg-[#f5f8ff] hover:text-royal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#2b3a63]";

export type Pagination = { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export function fmtDay(key: string): string {
  return new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

const badgeBase = "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap";

/** Registration payment state. Colour is never alone: every badge carries its word. */
export function RegistrationStatusBadge({ status }: { status: "paid" | "pending" }) {
  return status === "paid" ? (
    <span className={`${badgeBase} bg-[#e3f4e3] text-[#1d6b1d]`}>
      <Icon name="check" size={12} /> Paid
    </span>
  ) : (
    <span className={`${badgeBase} bg-[#fff1e0] text-[#8a4a00]`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#c46a00]" /> Payment pending
    </span>
  );
}

/** One Razorpay order's outcome. "created" = order created, no payment attempt recorded (maybe still open, maybe closed). */
export function PaymentStatusBadge({ status }: { status: "created" | "paid" | "failed" }) {
  if (status === "paid") {
    return (
      <span className={`${badgeBase} bg-[#e3f4e3] text-[#1d6b1d]`}>
        <Icon name="check" size={12} /> Paid
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={`${badgeBase} bg-[#fdece4] text-[#a33d0c]`}>
        <Icon name="alert" size={12} /> Failed
      </span>
    );
  }
  return <span className={`${badgeBase} bg-[#eef1f8] text-[#3d4a6b]`}>No payment yet</span>;
}

export type EmailStatus = "pending" | "sent" | "failed" | "skipped";

/** Payment confirmation email state. Unpaid registrations get their email after payment. */
export function EmailStatusBadge({
  status,
  paid,
  sentAt,
  error,
  attempts,
}: {
  status: EmailStatus | null;
  paid: boolean;
  sentAt: string | null;
  error: string | null;
  attempts: number;
}) {
  if (!paid && status === null) return <span className={`${badgeBase} bg-[#eef1f8] text-[#3d4a6b]`}>After payment</span>;
  if (status === "sent") {
    return (
      <span className={`${badgeBase} bg-[#e3f4e3] text-[#1d6b1d]`} title={sentAt ? `Sent ${fmtDateTime(sentAt)}` : undefined}>
        <Icon name="check" size={12} /> Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={`${badgeBase} bg-[#fdece4] text-[#a33d0c]`} title={error ? `${error} (${attempts} attempt${attempts === 1 ? "" : "s"})` : undefined}>
        <Icon name="alert" size={12} /> Failed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={`${badgeBase} bg-[#e9efff] text-royal`}>
        <Icon name="loader" size={12} className="animate-spin" /> Sending
      </span>
    );
  }
  return (
    <span className={`${badgeBase} bg-[#eef1f8] text-[#3d4a6b]`} title={error ?? "Paid before confirmation emails were added."}>
      Not sent
    </span>
  );
}

/** Resend the confirmation email (admin, CSRF). Returns the new delivery status or throws the server's message. */
export async function resendConfirmationEmail(registrationId: string): Promise<EmailStatus> {
  const csrf = await getCsrfToken();
  const res = await authFetch(`/api/admin/kids-challenge/registrations/${registrationId}/resend-email`, { method: "POST", headers: { "x-csrf-token": csrf } });
  const json = (await res.json().catch(() => null)) as { status?: EmailStatus; error?: { message?: string } } | null;
  if (!res.ok || !json?.status) throw new Error(json?.error?.message ?? "Could not resend the email. Try again.");
  return json.status;
}

/** Toast text for a resend outcome. */
export function resendMessage(status: EmailStatus, to: string): string {
  if (status === "sent") return `Confirmation email sent to ${to}.`;
  if (status === "skipped") return "Email is not configured on the server (SMTP), so nothing was sent.";
  return `Sending to ${to} failed. Check the email settings and try again.`;
}

export const smallButton =
  "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#8d9bc4] bg-white px-3 text-[13px] font-semibold text-navy transition-colors hover:border-royal hover:text-royal disabled:cursor-not-allowed disabled:opacity-50";

export function LoadingRow({ label }: { label: string }) {
  return (
    <p className="flex items-center justify-center gap-2 px-6 py-12 text-[14px] text-[#4a5a85]" role="status">
      <Icon name="loader" size={16} className="animate-spin" /> {label}
    </p>
  );
}

export function ErrorRow({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid justify-items-center gap-3 px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-[#a33d0c]">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={secondaryButton}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyRow({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-navy">{title}</p>
      <p className="mt-1 text-[13px] text-[#4a5a85]">{hint}</p>
    </div>
  );
}

export function Pager({
  pagination,
  loading,
  limits,
  onPage,
  onLimit,
}: {
  pagination: Pagination;
  loading: boolean;
  limits: readonly number[];
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
}) {
  if (pagination.total === 0) return null;
  return (
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
          <select value={pagination.limit} onChange={(e) => onLimit(Number(e.target.value))} className={`${field} h-8 px-2 text-[13px]`}>
            {limits.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#8d9bc4] bg-white">
          <button type="button" onClick={() => onPage(pagination.page - 1)} disabled={!pagination.hasPrevPage || loading} aria-label="Previous page" className={pageButton}>
            ← Prev
          </button>
          <span className="border-x border-line px-3 text-[13px] font-semibold whitespace-nowrap text-navy tabular-nums">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button type="button" onClick={() => onPage(pagination.page + 1)} disabled={!pagination.hasNextPage || loading} aria-label="Next page" className={pageButton}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Download a CSV through authFetch (not a plain link), so an expired access token is refreshed first. */
export async function downloadCsv(url: string, fallbackName: string): Promise<void> {
  const res = await authFetch(url);
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message ?? "Could not export. Try again.");
  }
  const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

/** GET JSON from an admin API; throws the server's message on failure. */
export async function getAdminJson<T>(url: string, fallbackError: string): Promise<T> {
  const res = await authFetch(url);
  const json = (await res.json().catch(() => null)) as (T & { success?: boolean; error?: { message?: string } }) | null;
  if (!res.ok || !json || json.success !== true) throw new Error(json?.error?.message ?? fallbackError);
  return json;
}

export function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3.5">
        <div>
          <h3 className="font-display text-[16px] font-bold text-navy">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
