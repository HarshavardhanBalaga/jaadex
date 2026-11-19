"use client";

import { useEffect, useId, useState } from "react";
import { authFetch, getCsrfToken } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";
import { fieldErrorsOf } from "@/lib/workshops/registration-validation";
import { AUDIENCE_LABEL, KIDS_MESSAGE_MAX, KIDS_SUBJECT_MAX, kidsChallengeEmailSchema, type KidsChallengeEmailInput } from "@/lib/kids-challenge/email-validation";
import { ATTACHMENT_ACCEPT, ATTACHMENT_TYPES_LABEL, MAX_ATTACHMENTS, MAX_TOTAL_ATTACHMENT_BYTES, formatBytes, precheckAttachment } from "@/lib/workshops/attachment-rules";
import { getAdminJson } from "./ui";

type Audience = "paid" | "pending" | "all" | "selected";
type AudienceCounts = { all: number; paid: number; pending: number };

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
 * Write and send an email to Kids Challenge parents: paid, awaiting payment, everyone, or the ticked rows.
 * Validates with the same zod schema as the API; delivery runs on the server after it responds.
 */
export function KidsChallengeEmailComposer({
  selectedIds,
  onSent,
  onClose,
}: {
  /** Ticked registrations; empty = choose an audience. */
  selectedIds: string[];
  onSent: (recipientCount: number) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [audience, setAudience] = useState<Audience>(selectedIds.length > 0 ? "selected" : "paid");
  const [counts, setCounts] = useState<AudienceCounts | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  /** Set when the admin pressed Send: the validated payload and the fresh recipient count to confirm. */
  const [confirmSend, setConfirmSend] = useState<{ payload: KidsChallengeEmailInput; count: number } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const uploading = attachments.some((a) => a.status === "uploading");
  const dirty = subject.trim() !== "" || message.trim() !== "" || attachments.length > 0;

  useEffect(() => {
    let cancelled = false;
    getAdminJson<{ audienceCounts: AudienceCounts }>("/api/admin/kids-challenge/emails?page=1", "Could not load recipient counts.").then(
      (json) => {
        if (!cancelled) setCounts(json.audienceCounts);
      },
      () => undefined, // counts are a convenience; the server resolves recipients either way
    );
    return () => {
      cancelled = true;
    };
  }, []);

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
        const res = await authFetch("/api/admin/kids-challenge/emails/attachments", { method: "POST", headers: { "x-csrf-token": csrf }, body });
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
    const checked = kidsChallengeEmailSchema.safeParse(payload);
    if (!checked.success) {
      setFieldErrors(fieldErrorsOf(checked.error));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      // Fresh counts right before sending: registrations may have changed since the composer opened.
      const fresh = await getAdminJson<{ audienceCounts: AudienceCounts }>("/api/admin/kids-challenge/emails?page=1", "Could not check the recipients. Try again.");
      setCounts(fresh.audienceCounts);
      const count = checked.data.audience === "selected" ? checked.data.registrationIds.length : fresh.audienceCounts[checked.data.audience];
      if (count === 0) throw new Error("No parents match this audience right now. Choose another one.");
      setConfirmSend({ payload: checked.data, count });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Confirmed: create the email; the server resolves the recipients again and returns the real count. */
  async function send(payload: KidsChallengeEmailInput) {
    setConfirmSend(null);
    setBusy(true);
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch("/api/admin/kids-challenge/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { recipientCount?: number; error?: { message?: string; fields?: Record<string, string[]> } } | null;
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

  const options: { value: Audience; count: number | null; hint: string }[] = [
    ...(selectedIds.length > 0 ? [{ value: "selected" as const, count: selectedIds.length, hint: "The rows you ticked in Registrations." }] : []),
    { value: "paid", count: counts?.paid ?? null, hint: "Confirmed registrations." },
    { value: "pending", count: counts?.pending ?? null, hint: "Registered but not paid yet. Their email gets a “Complete payment” button." },
    { value: "all", count: counts?.all ?? null, hint: "Every registration, paid or not." },
  ];

  return (
    <>
      <Modal labelledBy={`${id}-heading`} busy={busy} className="max-w-[640px]" onClose={requestClose}>
        <form onSubmit={onSubmit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
              <div className="min-w-0">
                <h2 id={`${id}-heading`} className="font-display text-[18px] font-bold text-navy">
                  Email parents
                </h2>
                <p className="mt-0.5 truncate text-[13px] text-muted">Kids Creative Challenge</p>
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
              <fieldset className="grid gap-2">
                <legend className={`${label} mb-2`}>To</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((o) => (
                    <label
                      key={o.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                        audience === o.value ? "border-royal bg-[#f5f8ff]" : "border-line hover:border-[#8d9bc4]"
                      }`}
                    >
                      <input type="radio" name={`${id}-audience`} value={o.value} checked={audience === o.value} onChange={() => setAudience(o.value)} className="mt-1 accent-royal" />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-navy">
                          {AUDIENCE_LABEL[o.value]}
                          {o.count !== null && <span className="ml-1.5 font-normal text-muted tabular-nums">({o.count})</span>}
                        </span>
                        <span className="block text-[12px] text-muted">{o.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {fieldErrors.registrationIds?.[0] && <p role="alert" className="text-[12px] font-medium text-[#c1440e]">{fieldErrors.registrationIds[0]}</p>}
              </fieldset>

              <div className="grid gap-2">
                <label className={label} htmlFor={`${id}-subject`}>
                  Subject
                </label>
                <input
                  id={`${id}-subject`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={KIDS_SUBJECT_MAX}
                  placeholder="e.g. Submission deadline for your comic and animation"
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
                    {message.length} / {KIDS_MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id={`${id}-message`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={KIDS_MESSAGE_MAX}
                  rows={9}
                  placeholder="Write your message. Each parent is greeted by name, and their child's name, class and registration status are added at the end."
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

      {confirmSend && (
        <ConfirmDialog
          title={`Send to ${confirmSend.count} parent${confirmSend.count === 1 ? "" : "s"}?`}
          description={`“${confirmSend.payload.subject.trim()}” will go to ${AUDIENCE_LABEL[confirmSend.payload.audience].toLowerCase()}${
            confirmSend.payload.attachmentIds.length ? ` with ${confirmSend.payload.attachmentIds.length} attachment${confirmSend.payload.attachmentIds.length === 1 ? "" : "s"}` : ""
          }. This can't be undone.`}
          confirmLabel="Send email"
          cancelLabel="Go back"
          onConfirm={() => void send(confirmSend.payload)}
          onClose={() => setConfirmSend(null)}
        />
      )}

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
