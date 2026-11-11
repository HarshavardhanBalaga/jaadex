"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";
import { WorkshopEmailComposer } from "@/components/admin/WorkshopEmailComposer";
import type { WorkshopListItem } from "@/components/admin/WorkshopList";
import { fieldErrorsOf, MAX_CAPACITY, registrationSettingsSchema } from "@/lib/workshops/registration-validation";
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

/** Delivery status of one email, used for confirmations and admin-written emails alike. */
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
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap";
  if (status === "sent") {
    return (
      <span className={`${base} bg-[#e8f6e8] text-green`} title={sentAt ? `Sent ${fmt(sentAt)}` : undefined}>
        Sent
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={`${base} bg-[#fdece4] text-[#c1440e]`} title={error ? `${error} (${attempts} attempt${attempts === 1 ? "" : "s"})` : undefined}>
        Failed
      </span>
    );
  }
  if (status === "pending" || status === "sending") return <span className={`${base} bg-[#e9efff] text-royal`}>Sending…</span>;
  return (
    <span className={`${base} bg-[#eef1f8] text-muted`} title={error ?? "Registered before confirmation emails were added."}>
      Not sent
    </span>
  );
}

/** Coloured action buttons for the registrations popup: tinted at rest, filled on hover. */
const toneButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const royalButton = `${toneButton} border-royal/30 bg-royal/10 text-royal hover:bg-royal hover:text-white`;
const greenButton = `${toneButton} border-green/30 bg-green/10 text-green hover:bg-green hover:text-white`;
const orangeButton = `${toneButton} border-orange/30 bg-orange/10 text-orange-dark hover:bg-orange-dark hover:text-white`;
const solidButton = `${toneButton} border-royal bg-royal text-white hover:bg-royal-dark`;


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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
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
    <Modal labelledBy={`${id}-heading`} busy={busy} dismissOnBackdrop className="max-w-[874px]" onClose={onClose}>
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
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-line bg-canvas/60 px-4 py-3">
            <div className="min-w-0">
              <label htmlFor={`${id}-capacity`} className="block text-[13px] font-semibold text-navy">
                Seat limit
              </label>
              <p id={`${id}-capacity-hint`} className="text-[12px] text-muted">
                Blank = unlimited. Closes automatically when full.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                className="h-10 w-32 rounded-xl border border-[#8d9bc4] bg-white px-3 text-[14px] text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button type="submit" disabled={busy} className={solidButton}>
                {busy && <Icon name="loader" size={16} className="inline-block animate-spin" />}
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setComposing(true)}
                disabled={!rows || rows.length === 0}
                aria-haspopup="dialog"
                className={royalButton}
              >
                <Icon name="mail" size={16} />
                {selected.size > 0 ? `Email selected (${selected.size})` : "Email all registrants"}
              </button>
              <button type="button" onClick={() => void exportCsv()} disabled={exporting || count === 0} className={greenButton}>
                <Icon name={exporting ? "loader" : "download"} size={16} className={exporting ? "inline-block animate-spin" : ""} />
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            </div>
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
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">
                    <th className="w-10 py-2.5 pl-4">
                      <input
                        type="checkbox"
                        aria-label="Select all registrants"
                        checked={selected.size > 0 && selected.size === rows.length}
                        ref={(el) => {
                          if (el) el.indeterminate = selected.size > 0 && selected.size < rows.length;
                        }}
                        onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                        className="size-4 cursor-pointer accent-royal"
                      />
                    </th>
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
                      <td className="py-2.5 pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.name}`}
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelected(r.id)}
                          className="size-4 cursor-pointer accent-royal"
                        />
                      </td>
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
                          <EmailStatusBadge status={r.emailStatus} sentAt={r.emailSentAt} error={r.emailError} attempts={r.emailAttempts} />
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

        <section className="overflow-hidden rounded-xl border border-line" aria-labelledby={`${id}-emails`}>
          <h3 id={`${id}-emails`} className="border-b border-line bg-[#f5f8ff] px-4 py-3 text-[13px] font-semibold text-navy">
            Emails sent
          </h3>
          {emailsError && (
            <p role="alert" className="border-b border-line bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
              {emailsError}
            </p>
          )}
          {emails === null ? (
            !emailsError && (
              <p className="flex items-center justify-center gap-2 px-4 py-6 text-[13px] text-muted" role="status">
                <Icon name="loader" size={16} className="inline-block animate-spin" /> Loading…
              </p>
            )
          ) : emails.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">No emails sent to registrants yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {emails.map((e) => {
                const expanded = expandedEmailId === e.id;
                return (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedEmailId(expanded ? null : e.id)}
                        aria-expanded={expanded}
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <p className="truncate text-[14px] font-semibold text-navy">{e.subject}</p>
                        <p className="mt-0.5 text-[12px] text-muted">
                          {fmt(e.createdAt)} · by {e.sentBy} · {e.audience === "all" ? "all registrants" : "selected registrants"}
                          {e.attachments.length > 0 && ` · ${e.attachments.length} attachment${e.attachments.length === 1 ? "" : "s"}`}
                        </p>
                        <p className="mt-1 text-[12px] font-medium">
                          <span className="text-green">{e.counts.sent} sent</span>
                          {e.counts.failed > 0 && <span className="text-[#c1440e]"> · {e.counts.failed} not delivered</span>}
                          {e.counts.sending > 0 && <span className="text-royal"> · {e.counts.sending} sending…</span>}
                        </p>
                      </button>
                      {e.counts.failed > 0 && (
                        <button type="button" onClick={() => void retryEmail(e)} disabled={retryingId !== null} className={orangeButton}>
                          {retryingId === e.id && <Icon name="loader" size={16} className="inline-block animate-spin" />}
                          {retryingId === e.id ? "Retrying…" : "Retry failed"}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <div className="mt-3 grid gap-3">
                        <p className="rounded-lg bg-[#f5f8ff] px-3 py-2 text-[13px] whitespace-pre-wrap text-navy">{e.message}</p>
                        {e.attachments.length > 0 && (
                          <ul className="flex flex-wrap gap-2" aria-label="Attachments">
                            {e.attachments.map((a, i) => (
                              <li key={`${a.filename}-${i}`} className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-navy">
                                {a.filename} <span className="text-muted">· {formatBytes(a.size)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <ul className="divide-y divide-line rounded-lg border border-line">
                          {e.recipients.map((r) => (
                            <li key={r.registrationId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
                              <span className="min-w-0 break-all text-navy">
                                {r.name} <span className="text-muted">· {r.email}</span>
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
      </div>

      {composing && rows && (
        <WorkshopEmailComposer
          workshopId={workshop.id}
          workshopTitle={workshop.title}
          selectedIds={[...selected]}
          totalRegistrants={rows.length}
          onClose={() => setComposing(false)}
          onSent={(recipientCount) => {
            setComposing(false);
            setSelected(new Set());
            onSaved(`Email is being sent to ${recipientCount} registrant${recipientCount === 1 ? "" : "s"}.`);
            void loadEmails();
          }}
        />
      )}
    </Modal>
  );
}
