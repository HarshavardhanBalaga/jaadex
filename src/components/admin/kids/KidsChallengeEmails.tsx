"use client";

import { useEffect, useState } from "react";
import { authFetch, getCsrfToken } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import type { KidsEmailRecipientRow, KidsEmailSummary } from "@/lib/kids-challenge/email-service";
import { AUDIENCE_LABEL } from "@/lib/kids-challenge/email-validation";
import { formatBytes } from "@/lib/workshops/attachment-rules";
import { KidsChallengeEmailComposer } from "./KidsChallengeEmailComposer";
import { EmailStatusBadge, EmptyRow, ErrorRow, fmtDateTime, getAdminJson, LoadingRow, Pager, primaryButton, smallButton, type Pagination } from "./ui";

/** How often the history refreshes while an email is still going out. */
const POLL_MS = 3000;

/** One sent email, expanded: message, attachments and every parent's delivery. */
function EmailDetails({ email, reloadToken }: { email: KidsEmailSummary; reloadToken: number }) {
  const [recipients, setRecipients] = useState<KidsEmailRecipientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminJson<{ email: { recipients: KidsEmailRecipientRow[] } }>(`/api/admin/kids-challenge/emails/${email.id}`, "Could not load the recipients.").then(
      (json) => {
        if (cancelled) return;
        setRecipients(json.email.recipients);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the recipients.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [email.id, reloadToken]);

  return (
    <div className="mt-4 grid gap-4 border-l-2 border-royal/30 pl-4">
      <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-[#2b3a63]">{email.message}</p>
      {email.attachments.length > 0 && (
        <p className="text-[13px] text-[#4a5a85]">Attached: {email.attachments.map((a) => `${a.filename} (${formatBytes(a.size)})`).join(", ")}</p>
      )}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-[#a33d0c]">
          {error}
        </p>
      ) : recipients === null ? (
        <p className="flex items-center gap-2 text-[13px] text-[#4a5a85]" role="status">
          <Icon name="loader" size={14} className="animate-spin" /> Loading recipients…
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {recipients.map((r) => (
            <li key={r.registrationId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
              <span className="min-w-0 break-all">
                <span className="font-semibold text-navy">{r.parentName}</span> <span className="text-[#4a5a85]">{r.parentEmail}</span>
                <span className="block text-[12px] text-[#6b7799]">for {r.studentName}</span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <EmailStatusBadge status={r.status === "sending" ? "pending" : r.status} paid sentAt={r.sentAt} error={r.lastError} attempts={r.attempts} />
                {r.status === "failed" && r.lastError && <span className="max-w-[260px] truncate text-[12px] text-[#a33d0c]" title={r.lastError}>{r.lastError}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Emails tab: every message sent to parents, how each delivery went, and retry for failures. */
export function KidsChallengeEmails({ onChanged }: { onChanged: (message: string) => void }) {
  const [page, setPage] = useState(1);
  const [emails, setEmails] = useState<KidsEmailSummary[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const requestKey = `${page}:${reloadToken}`;
  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    getAdminJson<{ emails: KidsEmailSummary[]; pagination: Pagination }>(`/api/admin/kids-challenge/emails?page=${page}`, "Could not load sent emails.").then(
      (json) => {
        if (cancelled) return;
        setEmails(json.emails);
        setPagination(json.pagination);
        setError(null);
        setLoadedKey(requestKey);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load sent emails.");
        setLoadedKey(requestKey);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, requestKey]);

  // Refresh while any email is still going out, so the counts update on their own.
  const stillSending = emails?.some((e) => e.counts.sending > 0) ?? false;
  useEffect(() => {
    if (!stillSending) return;
    const timer = window.setTimeout(reload, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [stillSending, emails]);

  async function retry(email: KidsEmailSummary) {
    if (retryingId) return;
    setRetryingId(email.id);
    setActionError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/admin/kids-challenge/emails/${email.id}/retry`, { method: "POST", headers: { "x-csrf-token": csrf } });
      const json = (await res.json().catch(() => null)) as { queued?: number; error?: { message?: string } } | null;
      if (!res.ok || typeof json?.queued !== "number") throw new Error(json?.error?.message ?? "Could not retry. Try again.");
      onChanged(`Retrying ${json.queued} recipient${json.queued === 1 ? "" : "s"} of “${email.subject}”.`);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not retry. Try again.");
    } finally {
      setRetryingId(null);
    }
  }

  const loading = emails !== null && loadedKey !== requestKey;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h3 className="font-display text-[16px] font-bold text-navy">Emails to parents</h3>
          <p className="mt-0.5 text-[13px] text-muted">Every message you have sent, and how each delivery went. “Sent” means the mail server accepted it.</p>
        </div>
        <button type="button" onClick={() => setComposing(true)} className={primaryButton}>
          <Icon name="mail" size={16} /> Email parents
        </button>
      </div>
      {actionError && (
        <p role="alert" className="px-6 pt-3 text-[13px] font-medium text-[#a33d0c]">
          {actionError}
        </p>
      )}

      {error && emails === null ? (
        <ErrorRow message={error} onRetry={reload} />
      ) : emails === null ? (
        <LoadingRow label="Loading sent emails…" />
      ) : emails.length === 0 ? (
        <EmptyRow title="No emails sent yet" hint="Use “Email parents” to send an update, a reminder or a payment nudge." />
      ) : (
        <ul className={`divide-y divide-line px-6 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {emails.map((e) => {
            const expanded = expandedId === e.id;
            return (
              <li key={e.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold break-words text-navy">{e.subject}</p>
                    <p className="mt-0.5 text-[13px] text-[#4a5a85]">
                      {fmtDateTime(e.createdAt)} · by {e.sentBy} · {AUDIENCE_LABEL[e.audience].toLowerCase()} ({e.counts.total})
                      {e.attachments.length > 0 && ` · ${e.attachments.length} attachment${e.attachments.length === 1 ? "" : "s"}`}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] font-medium">
                      <span className="text-[#1d6b1d]">{e.counts.sent} sent</span>
                      {e.counts.failed > 0 && <span className="text-[#a33d0c]">{e.counts.failed} not delivered</span>}
                      {e.counts.sending > 0 && (
                        <span className="inline-flex items-center gap-1 text-royal">
                          <Icon name="loader" size={12} className="animate-spin" /> {e.counts.sending} sending
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.counts.failed > 0 && (
                      <button type="button" onClick={() => void retry(e)} disabled={retryingId !== null} className={smallButton}>
                        {retryingId === e.id && <Icon name="loader" size={13} className="animate-spin" />}
                        {retryingId === e.id ? "Retrying…" : "Retry failed"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : e.id)}
                      aria-expanded={expanded}
                      className="h-8 cursor-pointer rounded-lg px-3 text-[13px] font-semibold text-royal transition-colors hover:bg-royal/10"
                    >
                      {expanded ? "Hide details" : "View details"}
                    </button>
                  </div>
                </div>
                {expanded && <EmailDetails email={e} reloadToken={reloadToken} />}
              </li>
            );
          })}
        </ul>
      )}

      {pagination && pagination.total > pagination.limit && (
        <Pager pagination={pagination} loading={loading} limits={[pagination.limit]} onPage={setPage} onLimit={() => undefined} />
      )}

      {composing && (
        <KidsChallengeEmailComposer
          selectedIds={[]}
          onClose={() => setComposing(false)}
          onSent={(count) => {
            setComposing(false);
            onChanged(`Email is being sent to ${count} parent${count === 1 ? "" : "s"}.`);
            setPage(1);
            reload();
          }}
        />
      )}
    </section>
  );
}
