"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";
import type { WorkshopListItem } from "@/components/admin/WorkshopList";
import { fieldErrorsOf, MAX_CAPACITY, registrationSettingsSchema } from "@/lib/workshops/registration-validation";

type EmailStatus = "pending" | "sent" | "failed" | "skipped";

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

function EmailStatusBadge({ r }: { r: Registration }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap";
  if (r.emailStatus === "sent") {
    return (
      <span className={`${base} bg-[#e8f6e8] text-green`} title={r.emailSentAt ? `Sent ${fmt(r.emailSentAt)}` : undefined}>
        Sent
      </span>
    );
  }
  if (r.emailStatus === "failed") {
    return (
      <span className={`${base} bg-[#fdece4] text-[#c1440e]`} title={r.emailError ? `${r.emailError} (${r.emailAttempts} attempt${r.emailAttempts === 1 ? "" : "s"})` : undefined}>
        Failed
      </span>
    );
  }
  if (r.emailStatus === "pending") return <span className={`${base} bg-[#e9efff] text-royal`}>Sending…</span>;
  return (
    <span className={`${base} bg-[#eef1f8] text-muted`} title={r.emailError ?? "Registered before confirmation emails were added."}>
      Not sent
    </span>
  );
}

const field =
  "w-full rounded-xl border border-[#8d9bc4] bg-white px-4 py-2.5 text-[14px] text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:bg-[#f5f8ff] disabled:opacity-70";
const secondaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-[13px] font-semibold text-navy transition-colors hover:border-royal/40 hover:text-royal disabled:cursor-not-allowed disabled:opacity-60";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Seat limit setting, the list of registrations, and CSV export for one workshop. */
export function WorkshopRegistrationsDialog({
  workshop,
  onSaved,
  onClose,
}: {
  workshop: WorkshopListItem;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(workshop.registration.capacity === null ? "" : String(workshop.registration.capacity));
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const busy = saving || isRefreshing;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/workshops/${workshop.id}/registrations`);
        const json = (await res.json().catch(() => null)) as { registrations?: Registration[]; error?: { message?: string } } | null;
        if (!res.ok || !json?.registrations) throw new Error(json?.error?.message ?? "Could not load registrations. Try again.");
        if (!cancelled) setRows(json.registrations);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load registrations. Try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workshop.id]);

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

  return (
    <Modal labelledBy={`${id}-heading`} busy={busy} dismissOnBackdrop className="max-w-[760px]" onClose={onClose}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
        <div className="min-w-0">
          <h2 id={`${id}-heading`} className="font-display text-[18px] font-bold text-navy">
            Registrations
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">{workshop.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#f5f8ff] hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="close" size={21} />
        </button>
      </header>

      <div className="grid gap-6 p-6">
        <form onSubmit={saveCapacity} noValidate className="grid gap-2">
          <label htmlFor={`${id}-capacity`} className="text-[13px] font-semibold text-navy">
            Seat limit
          </label>
          <div className="flex flex-wrap items-start gap-3">
            <input
              id={`${id}-capacity`}
              type="number"
              inputMode="numeric"
              min={Math.max(1, count)}
              max={MAX_CAPACITY}
              step={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
              disabled={busy}
              aria-invalid={Boolean(capacityError)}
              aria-describedby={`${id}-capacity-hint`}
              className={`${field} max-w-[180px]`}
            />
            <button type="submit" disabled={busy} className={secondaryButton}>
              {busy && <Icon name="loader" size={16} className="inline-block animate-spin" />}
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          <p id={`${id}-capacity-hint`} className="text-[12px] text-muted">
            Leave blank for unlimited seats. Registration closes automatically when the limit is reached.
          </p>
          {capacityError && (
            <p role="alert" className="rounded-xl bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
              {capacityError}
            </p>
          )}
        </form>

        <section className="overflow-hidden rounded-xl border border-line" aria-labelledby={`${id}-list`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f5f8ff] px-4 py-3">
            <h3 id={`${id}-list`} className="text-[13px] font-semibold text-navy">
              {count} registered
              {workshop.registration.capacity !== null && ` of ${workshop.registration.capacity} seats`}
            </h3>
            <button type="button" onClick={() => void exportCsv()} disabled={exporting || count === 0} className={secondaryButton}>
              <Icon name={exporting ? "loader" : "download"} size={16} className={exporting ? "inline-block animate-spin" : ""} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          {exportError && (
            <p role="alert" className="border-b border-line bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
              {exportError}
            </p>
          )}
          {resendError && (
            <p role="alert" className="border-b border-line bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
              {resendError}
            </p>
          )}
          {loadError ? (
            <p role="alert" className="px-4 py-6 text-center text-[13px] text-[#c1440e]">
              {loadError}
            </p>
          ) : rows === null ? (
            <p className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-muted" role="status">
              <Icon name="loader" size={16} className="inline-block animate-spin" /> Loading registrations…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Registered</th>
                    <th className="px-4 py-2.5">Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 text-navy break-all">{r.name}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                        <a href={`tel:${r.phone}`} className="hover:text-royal">{r.phone}</a>
                      </td>
                      <td className="px-4 py-2.5 text-muted break-all">
                        <a href={`mailto:${r.email}`} className="hover:text-royal">{r.email}</a>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{fmt(r.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <EmailStatusBadge r={r} />
                          {canResend(r.emailStatus) && (
                            <button
                              type="button"
                              onClick={() => void resendEmail(r)}
                              disabled={resendingId !== null}
                              aria-label={`Resend confirmation email to ${r.email}`}
                              className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-semibold whitespace-nowrap text-royal hover:underline disabled:cursor-wait disabled:opacity-60"
                            >
                              {resendingId === r.id && <Icon name="loader" size={13} className="inline-block animate-spin" />}
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
        </section>
      </div>
    </Modal>
  );
}
