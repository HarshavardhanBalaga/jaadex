"use client";

import { useId, useState } from "react";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { MESSAGE_MAX, SUBJECT_MAX, workshopEmailSchema } from "@/lib/workshops/workshop-email-validation";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_TYPES_LABEL,
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  formatBytes,
  precheckAttachment,
} from "@/lib/workshops/attachment-rules";

type AttachmentItem = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "ready" | "error";
  /** Set once uploaded. */
  id?: string;
  error?: string;
};

const field =
  "w-full rounded-xl border border-[#8d9bc4] bg-white px-4 py-3 text-[15px] leading-snug text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15 disabled:cursor-not-allowed disabled:bg-[#f5f8ff] disabled:opacity-70 aria-invalid:border-[#c1440e]";
const label = "text-[13px] font-semibold text-navy";

/**
 * Write and send an email to all or selected registrants of one workshop.
 * Validates with the same zod schema as the API; delivery runs on the server after it responds.
 */
export function WorkshopEmailComposer({
  workshopId,
  workshopTitle,
  selectedIds,
  totalRegistrants,
  onSent,
  onClose,
}: {
  workshopId: string;
  workshopTitle: string;
  /** Empty = all registrants. */
  selectedIds: string[];
  totalRegistrants: number;
  onSent: (recipientCount: number) => void;
  onClose: () => void;
}) {
  const id = useId();
  const audience = selectedIds.length > 0 ? "selected" : "all";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const uploading = attachments.some((a) => a.status === "uploading");
  const dirty = subject.trim() !== "" || message.trim() !== "" || attachments.length > 0;

  function patchAttachment(key: string, patch: Partial<AttachmentItem>) {
    setAttachments((current) => current.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  /** Upload each picked file on its own (keeps every request under the host's body limit). */
  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // lets the same file be picked again after removing it
    setAttachError(null);
    const kept = attachments.filter((a) => a.status !== "error");
    let count = kept.length;
    let total = kept.reduce((sum, a) => sum + a.size, 0);
    const queued: { item: AttachmentItem; file: File }[] = [];
    for (const file of picked) {
      const problem =
        precheckAttachment(file.name, file.size) ??
        (count >= MAX_ATTACHMENTS ? `You can attach up to ${MAX_ATTACHMENTS} files.` : null) ??
        (total + file.size > MAX_TOTAL_ATTACHMENT_BYTES ? `Attachments must add up to less than ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.` : null);
      if (problem) {
        setAttachError(problem);
        continue;
      }
      count += 1;
      total += file.size;
      queued.push({ item: { key: `${Date.now()}-${queued.length}-${file.name}`, name: file.name, size: file.size, status: "uploading" }, file });
    }
    if (queued.length === 0) return;
    setAttachments([...kept, ...queued.map((q) => q.item)]);
    for (const { item, file } of queued) {
      try {
        const csrf = await getCsrfToken();
        const body = new FormData();
        body.append("file", file);
        const res = await authFetch(`/api/workshops/${workshopId}/emails/attachments`, {
          method: "POST",
          headers: { "x-csrf-token": csrf },
          body,
        });
        const json = (await res.json().catch(() => null)) as { attachment?: { id: string }; error?: { message?: string } } | null;
        if (!res.ok || !json?.attachment) throw new Error(json?.error?.message ?? `Could not upload ${file.name}.`);
        patchAttachment(item.key, { status: "ready", id: json.attachment.id });
      } catch (err) {
        patchAttachment(item.key, { status: "error", error: err instanceof Error ? err.message : `Could not upload ${file.name}.` });
      }
    }
  }

  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || uploading) return;
    setError(null);
    const payload = {
      subject,
      message,
      audience,
      registrationIds: audience === "selected" ? selectedIds : [],
      attachmentIds: attachments.flatMap((a) => (a.status === "ready" && a.id ? [a.id] : [])),
    };
    // Same schema as the server: catch mistakes before a round trip.
    const checked = workshopEmailSchema.safeParse(payload);
    if (!checked.success) {
      setFieldErrors(fieldErrorsOf(checked.error));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/workshops/${workshopId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(checked.data),
      });
      const json = (await res.json().catch(() => null)) as {
        recipientCount?: number;
        error?: { message?: string; fields?: Record<string, string[]> };
      } | null;
      if (!res.ok || typeof json?.recipientCount !== "number") {
        if (json?.error?.fields) setFieldErrors(json.error.fields);
        throw new Error(json?.error?.message ?? "Could not send the email. Try again.");
      }
      onSent(json.recipientCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const recipientsLabel =
    audience === "all"
      ? `All ${totalRegistrants} registrant${totalRegistrants === 1 ? "" : "s"}`
      : `${selectedIds.length} selected registrant${selectedIds.length === 1 ? "" : "s"}`;

  return (
    <>
      <Modal labelledBy={`${id}-heading`} busy={busy} className="max-w-[620px]" onClose={requestClose}>
        <form onSubmit={onSubmit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
              <div className="min-w-0">
                <h2 id={`${id}-heading`} className="font-display text-[18px] font-bold text-navy">
                  Email registrants
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-muted">{workshopTitle}</p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#f5f8ff] hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="close" size={21} />
              </button>
            </header>

            <div className="grid gap-5 p-6">
              <p className="rounded-xl bg-[#f5f8ff] px-4 py-3 text-[13px] text-navy">
                <span className="font-semibold">To:</span> {recipientsLabel}
                {fieldErrors.registrationIds?.[0] && <span className="mt-1 block text-[#c1440e]">{fieldErrors.registrationIds[0]}</span>}
              </p>

              <div className="grid gap-2">
                <label className={label} htmlFor={`${id}-subject`}>
                  Subject
                </label>
                <input
                  id={`${id}-subject`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={SUBJECT_MAX}
                  placeholder="e.g. Venue and timings for the workshop"
                  aria-invalid={Boolean(fieldErrors.subject)}
                  className={field}
                />
                {fieldErrors.subject?.[0] && <p role="alert" className="text-[12px] font-medium text-[#c1440e]">{fieldErrors.subject[0]}</p>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label className={label} htmlFor={`${id}-message`}>
                    Message
                  </label>
                  <span className="text-[12px] text-muted tabular-nums">
                    {message.length} / {MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id={`${id}-message`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MESSAGE_MAX}
                  rows={9}
                  placeholder="Write your message. Each person is greeted by name, and the workshop's date and location are added at the end."
                  aria-invalid={Boolean(fieldErrors.message)}
                  className={`${field} resize-y`}
                />
                {fieldErrors.message?.[0] && <p role="alert" className="text-[12px] font-medium text-[#c1440e]">{fieldErrors.message[0]}</p>}
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className={label}>Attachments (optional)</p>
                  <span className="text-[12px] text-muted">
                    Up to {MAX_ATTACHMENTS} files, {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} in total
                  </span>
                </div>
                {attachments.length > 0 && (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {attachments.map((a) => (
                      <li key={a.key} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                        <Icon
                          name={a.status === "uploading" ? "loader" : a.status === "ready" ? "check" : "close"}
                          size={16}
                          className={a.status === "uploading" ? "inline-block animate-spin text-royal" : a.status === "ready" ? "text-green" : "text-[#c1440e]"}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-navy">{a.name}</span>
                          <span className={`block text-[12px] ${a.status === "error" ? "text-[#c1440e]" : "text-muted"}`}>
                            {a.status === "error" ? a.error : a.status === "uploading" ? "Uploading…" : formatBytes(a.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttachments((current) => current.filter((x) => x.key !== a.key))}
                          disabled={a.status === "uploading"}
                          aria-label={`Remove ${a.name}`}
                          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#fdece4] hover:text-[#c1440e] disabled:cursor-wait disabled:opacity-50"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label
                  htmlFor={`${id}-files`}
                  className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#8d9bc4] bg-[#f5f8ff] px-4 py-2.5 text-[13px] font-semibold text-royal transition-colors hover:border-royal focus-within:ring-4 focus-within:ring-royal/15"
                >
                  <Icon name="plus" size={16} />
                  Attach files
                  <input id={`${id}-files`} type="file" multiple accept={ATTACHMENT_ACCEPT} onChange={(e) => void onPickFiles(e)} className="sr-only" />
                </label>
                <p className="text-[12px] text-muted">{ATTACHMENT_TYPES_LABEL}. Each file up to 4 MB.</p>
                {(attachError || fieldErrors.attachmentIds?.[0]) && (
                  <p role="alert" className="text-[12px] font-medium text-[#c1440e]">
                    {attachError ?? fieldErrors.attachmentIds?.[0]}
                  </p>
                )}
              </div>
            </div>

            <footer className="sticky bottom-0 z-10 grid gap-3 border-t border-line bg-white px-6 py-4">
              {error && (
                <p role="alert" className="rounded-xl bg-[#fdece4] px-4 py-3 text-[13px] font-medium text-[#c1440e]">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-5 text-[14px] font-semibold text-muted transition-colors hover:border-navy/30 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  title={uploading ? "Wait for the attachments to finish uploading." : undefined}
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-royal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {busy ? <Icon name="loader" size={18} className="inline-block animate-spin" /> : <Icon name="mail" size={18} />}
                  {busy ? "Sending…" : "Send email"}
                </button>
              </div>
            </footer>
          </fieldset>
        </form>
      </Modal>

      {confirmingDiscard && (
        <ConfirmDialog
          title="Discard this email?"
          description="What you’ve written will be lost."
          confirmLabel="Discard email"
          cancelLabel="Keep writing"
          onConfirm={onClose}
          onClose={() => setConfirmingDiscard(false)}
        />
      )}
    </>
  );
}
