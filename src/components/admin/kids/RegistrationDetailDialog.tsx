"use client";

import { useEffect, useId, useState } from "react";
import { authFetch, getCsrfToken } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";
import type { AdminRegistrationDetail } from "@/lib/kids-challenge/admin-service";
import { formatInr, methodLabel } from "@/lib/kids-challenge/analytics";
import {
  EmailStatusBadge,
  ErrorRow,
  fmtDateTime,
  getAdminJson,
  LoadingRow,
  PaymentStatusBadge,
  primaryButton,
  RegistrationStatusBadge,
  resendConfirmationEmail,
  resendMessage,
  secondaryButton,
} from "./ui";

const SOURCE_LABEL = { checkout: "checkout", webhook: "Razorpay webhook", admin_sync: "admin sync" } as const;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-[1px] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-[14px] break-words text-navy">{children}</dd>
    </div>
  );
}

/** Everything about one registration, its full payment history, and a Razorpay re-check. */
export function RegistrationDetailDialog({ registrationId, onClose, onChanged }: { registrationId: string; onClose: () => void; onChanged: (message: string) => void }) {
  const id = useId();
  const [reg, setReg] = useState<AdminRegistrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function resendEmail() {
    if (resending || !reg) return;
    setResending(true);
    setEmailMessage(null);
    try {
      const status = await resendConfirmationEmail(registrationId);
      setEmailMessage({ tone: status === "sent" ? "ok" : "error", text: resendMessage(status, reg.parentEmail) });
      if (status === "sent") onChanged(resendMessage(status, reg.parentEmail));
      reload();
    } catch (err) {
      setEmailMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not resend the email. Try again." });
    } finally {
      setResending(false);
    }
  }

  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    getAdminJson<{ registration: AdminRegistrationDetail }>(`/api/admin/kids-challenge/registrations/${registrationId}`, "Could not load this registration.").then(
      (json) => {
        if (cancelled) return;
        setReg(json.registration);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this registration.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [registrationId, reloadToken]);

  async function sync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const csrf = await getCsrfToken();
      const res = await authFetch(`/api/admin/kids-challenge/registrations/${registrationId}/sync`, { method: "POST", headers: { "x-csrf-token": csrf } });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        sync?: { status: "paid" | "already_paid" | "still_pending"; checkedOrders: number; failedAttemptsFound: number };
        error?: { message?: string };
      } | null;
      if (!res.ok || !json?.sync) throw new Error(json?.error?.message ?? "Could not check with Razorpay.");
      const s = json.sync;
      const orders = `${s.checkedOrders} order${s.checkedOrders === 1 ? "" : "s"} checked`;
      if (s.status === "paid") {
        setSyncMessage({ tone: "ok", text: `Payment found and confirmed (${orders}).` });
        onChanged("Payment confirmed from Razorpay.");
      } else if (s.status === "already_paid") {
        setSyncMessage({ tone: "ok", text: `Already paid. Razorpay agrees (${orders}).` });
      } else {
        setSyncMessage({ tone: "ok", text: `No successful payment on Razorpay yet (${orders}${s.failedAttemptsFound ? `, ${s.failedAttemptsFound} failed attempt${s.failedAttemptsFound === 1 ? "" : "s"}` : ""}).` });
      }
      reload();
    } catch (err) {
      setSyncMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not check with Razorpay." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Modal labelledBy={`${id}-title`} busy={syncing} dismissOnBackdrop className="max-w-[760px]" onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <p className="text-[12px] font-bold tracking-[1.2px] text-[#4a5a85] uppercase">Kids Challenge registration</p>
          <h3 id={`${id}-title`} className="mt-1 font-display text-[20px] font-bold break-words text-navy">
            {reg?.studentName ?? "Loading…"}
          </h3>
        </div>
        <button type="button" onClick={onClose} disabled={syncing} aria-label="Close" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-navy hover:bg-[#f0f4fb]">
          <Icon name="close" size={20} />
        </button>
      </div>

      {error ? (
        <ErrorRow message={error} onRetry={reload} />
      ) : !reg ? (
        <LoadingRow label="Loading registration…" />
      ) : (
        <div className="grid gap-6 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f9fd] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <RegistrationStatusBadge status={reg.paymentStatus} />
              <span className="font-display text-[18px] font-bold text-navy tabular-nums">{formatInr(reg.amountPaise)}</span>
              {reg.paidAt && <span className="text-[13px] text-muted">paid {fmtDateTime(reg.paidAt)}</span>}
            </div>
            <button type="button" onClick={() => void sync()} disabled={syncing} className={reg.paymentStatus === "paid" ? secondaryButton : primaryButton}>
              <Icon name={syncing ? "loader" : "refresh"} size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Checking…" : "Check with Razorpay"}
            </button>
          </div>
          {syncMessage && (
            <p role={syncMessage.tone === "error" ? "alert" : "status"} className={`-mt-3 text-[13px] font-medium ${syncMessage.tone === "error" ? "text-[#a33d0c]" : "text-[#1d6b1d]"}`}>
              {syncMessage.text}
            </p>
          )}

          <section aria-labelledby={`${id}-student`}>
            <h4 id={`${id}-student`} className="mb-3 font-display text-[15px] font-bold text-navy">
              Student
            </h4>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Detail label="Name">{reg.studentName}</Detail>
              <Detail label="Class">Class {reg.studentClass}</Detail>
              <Detail label="Age">{reg.studentAge}</Detail>
              <Detail label="School">{reg.schoolName}</Detail>
              <Detail label="City">{reg.city}</Detail>
              <Detail label="State">{reg.state}</Detail>
            </dl>
          </section>

          <section aria-labelledby={`${id}-parent`}>
            <h4 id={`${id}-parent`} className="mb-3 font-display text-[15px] font-bold text-navy">
              Parent / guardian
            </h4>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Detail label="Name">{reg.parentName}</Detail>
              <Detail label="Email">
                <a href={`mailto:${reg.parentEmail}`} className="break-all hover:text-royal">
                  {reg.parentEmail}
                </a>
              </Detail>
              <Detail label="Phone">
                <a href={`tel:+91${reg.parentPhone}`} className="hover:text-royal">
                  {reg.parentPhone}
                </a>
              </Detail>
              <Detail label="Consent">{reg.consent ? "Given" : "Not recorded"}</Detail>
              <Detail label="Registered">{fmtDateTime(reg.createdAt)}</Detail>
              <Detail label="Registration ID">
                <span className="font-mono text-[12px]">{reg.id}</span>
              </Detail>
            </dl>
          </section>

          <section aria-labelledby={`${id}-email`}>
            <h4 id={`${id}-email`} className="mb-3 font-display text-[15px] font-bold text-navy">
              Confirmation email
            </h4>
            {reg.paymentStatus !== "paid" ? (
              <p className="text-[13px] text-muted">Sent automatically once the ₹99 payment is confirmed.</p>
            ) : (
              <div className="grid gap-3 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <EmailStatusBadge status={reg.emailStatus} paid sentAt={reg.emailSentAt} error={reg.emailError} attempts={reg.emailAttempts} />
                    <span className="text-[13px] break-all text-muted">to {reg.parentEmail}</span>
                  </div>
                  <button type="button" onClick={() => void resendEmail()} disabled={resending || reg.emailStatus === "pending"} className={secondaryButton}>
                    <Icon name={resending ? "loader" : "mail"} size={16} className={resending ? "animate-spin" : ""} />
                    {resending ? "Sending…" : "Resend email"}
                  </button>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted">Last sent: </dt>
                    <dd className="inline text-navy">{fmtDateTime(reg.emailSentAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted">Attempts: </dt>
                    <dd className="inline text-navy tabular-nums">{reg.emailAttempts}</dd>
                  </div>
                  {reg.emailError && reg.emailStatus !== "sent" && (
                    <div className="sm:col-span-2">
                      <dt className="inline text-muted">Last error: </dt>
                      <dd className="inline text-[#a33d0c]">{reg.emailError}</dd>
                    </div>
                  )}
                </dl>
                <p className="text-[12px] text-muted">Resending sends the same confirmation again to the parent&apos;s registered email address.</p>
                {emailMessage && (
                  <p role={emailMessage.tone === "error" ? "alert" : "status"} className={`text-[13px] font-medium ${emailMessage.tone === "error" ? "text-[#a33d0c]" : "text-[#1d6b1d]"}`}>
                    {emailMessage.text}
                  </p>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby={`${id}-payments`}>
            <h4 id={`${id}-payments`} className="mb-3 font-display text-[15px] font-bold text-navy">
              Payment history
            </h4>
            {reg.payments.length === 0 ? (
              <p className="text-[13px] text-muted">No Razorpay order has been created for this registration (the parent never clicked Pay).</p>
            ) : (
              <ol className="grid gap-3">
                {reg.payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PaymentStatusBadge status={p.status} />
                        <span className="font-semibold text-navy tabular-nums">{formatInr(p.amountPaise)}</span>
                        {p.method && <span className="text-[13px] text-muted">via {methodLabel(p.method)}</span>}
                      </div>
                      <span className="text-[12px] text-muted">Started {fmtDateTime(p.createdAt)}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                      <div>
                        <dt className="inline text-muted">Order: </dt>
                        <dd className="inline font-mono text-[12px] break-all text-navy">{p.orderId}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted">Payment: </dt>
                        <dd className="inline font-mono text-[12px] break-all text-navy">{p.paymentId ?? "—"}</dd>
                      </div>
                      {p.status === "paid" && (
                        <>
                          <div>
                            <dt className="inline text-muted">Paid: </dt>
                            <dd className="inline text-navy">
                              {fmtDateTime(p.paidAt)}
                              {p.confirmedBy && ` · confirmed by ${SOURCE_LABEL[p.confirmedBy]}`}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline text-muted">Razorpay fee: </dt>
                            <dd className="inline text-navy tabular-nums">
                              {p.feePaise === null
                                ? "Not reported by Razorpay yet (use Check with Razorpay later)"
                                : `${formatInr(p.feePaise)}${p.taxPaise !== null ? ` (incl. ${formatInr(p.taxPaise)} GST)` : ""}`}
                            </dd>
                          </div>
                        </>
                      )}
                      {p.failedAttempts > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="inline text-muted">Failed attempts: </dt>
                          <dd className="inline text-[#a33d0c]">
                            {p.failedAttempts}
                            {p.errorDescription && ` · last: ${p.errorDescription}`}
                            {p.lastFailedAt && ` (${fmtDateTime(p.lastFailedAt)})`}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
