"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/admin/Modal";
import { fieldErrorsOf, registrationSchema } from "@/lib/workshops/registration-validation";

const LOGIN_URL = `/login?next=${encodeURIComponent("/workshops")}`;

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-[10px] text-center text-[15px] font-black transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange motion-reduce:transition-none";
const fieldClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10 aria-invalid:border-[#a3410a]";

type Props = {
  workshopId: string;
  workshopTitle: string;
  seatsLeft: number | null; // null = unlimited
  /** Signed-in website user, used to prefill the form. null = not logged in. */
  user: { name: string; email: string } | null;
  /** This user (by account or account email) already holds a seat. */
  alreadyRegistered: boolean;
};

/**
 * "Register now" for an upcoming workshop with registration open.
 * Already registered → clicking explains they have a seat (checked first, so a full workshop still shows their booking).
 * Seats full → the button stays, and clicking it explains registration has closed.
 * Otherwise logged-out visitors go to login first, and signed-in users get the form.
 * The form validates with the same zod schema as the API, then the server validates again as the authority.
 */
export function WorkshopRegisterButton({ workshopId, workshopTitle, seatsLeft, user, alreadyRegistered }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"form" | "closed" | "registered" | null>(null);

  function onRegisterClick() {
    if (user && alreadyRegistered) setDialog("registered");
    // No point sending someone to log in for a workshop that is already full.
    else if (seatsLeft === 0) setDialog("closed");
    else if (user) setDialog("form");
    else router.push(LOGIN_URL);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup={seatsLeft === 0 || user ? "dialog" : undefined}
        onClick={onRegisterClick}
        className={`${buttonClass} cursor-pointer bg-orange text-white shadow-pop-orange hover:-translate-y-0.5`}
      >
        Register now ↗
      </button>
      {dialog === "closed" && (
        <InfoDialog title="Registrations closed" workshopTitle={workshopTitle} onClose={() => setDialog(null)}>
          <ClosedBody onClose={() => setDialog(null)} />
        </InfoDialog>
      )}
      {dialog === "registered" && (
        <InfoDialog title="You're already registered" workshopTitle={workshopTitle} onClose={() => setDialog(null)}>
          <RegisteredBody onClose={() => setDialog(null)} />
        </InfoDialog>
      )}
      {dialog === "form" && user && (
        <RegisterDialog workshopId={workshopId} workshopTitle={workshopTitle} user={user} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

/** Thank-you message once every seat is taken (or the admin closed registration). */
function RegistrationClosedNotice() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-[13px] border border-[#cfd9f0] bg-[#f5f8ff] p-[15px]">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-royal text-white">
        <Icon name="heart" size={17} />
      </span>
      <p className="min-w-0 text-[14px] leading-[1.6] text-muted">
        All seats for this workshop have been filled. Thank you for your interest! Use “Ask about this workshop” and we’ll let
        you know about the next session.
      </p>
    </div>
  );
}

function DialogHeader({ headingId, title, subtitle, disabled = false, onClose }: { headingId: string; title: string; subtitle: string; disabled?: boolean; onClose: () => void }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
      <div className="min-w-0">
        <h2 id={headingId} className="font-display text-[18px] font-bold text-navy">
          {title}
        </h2>
        <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Close"
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-[#f5f8ff] hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="close" size={21} />
      </button>
    </header>
  );
}

function ClosedBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-5 p-6">
      <RegistrationClosedNotice />
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-royal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark"
      >
        Close
      </button>
    </div>
  );
}

function RegisteredBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-5 p-6">
      <div role="status" className="flex items-start gap-3 rounded-[13px] bg-[#e8f6e8] p-[15px] text-[14px] text-navy">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green text-white">
          <Icon name="check" size={18} />
        </span>
        <p className="leading-[1.6]">
          You already have a seat for this workshop. We&apos;ll contact you at the email or phone number you registered with.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-royal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark"
      >
        Close
      </button>
    </div>
  );
}

/** A message-only modal: header plus one of the bodies above. */
function InfoDialog({ title, workshopTitle, onClose, children }: { title: string; workshopTitle: string; onClose: () => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <Modal labelledBy={`${id}-heading`} dismissOnBackdrop className="max-w-[480px]" onClose={onClose}>
      <DialogHeader headingId={`${id}-heading`} title={title} subtitle={workshopTitle} onClose={onClose} />
      {children}
    </Modal>
  );
}

function RegisterDialog({
  workshopId,
  workshopTitle,
  user,
  onClose,
}: {
  workshopId: string;
  workshopTitle: string;
  user: { name: string; email: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [form, setForm] = useState({ name: user.name, phone: "", email: user.email, website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Learned on submit: the last seat went / admin closed registration ("closed"),
  // or this account registered in another tab ("registered").
  const [outcome, setOutcome] = useState<"closed" | "registered" | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isRefreshing, startRefresh] = useTransition();
  const saving = busy || isRefreshing;

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeDialog() {
    if (outcome) router.refresh();
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    // Same schema as the server: catch mistakes before a round trip.
    const checked = registrationSchema.safeParse(form);
    if (!checked.success) {
      setFieldErrors(fieldErrorsOf(checked.error));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/registrations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { code?: string; message?: string; fields?: Record<string, string[]> };
      };
      if (res.status === 401) {
        // Session expired since the page loaded: log in again, then come back here.
        router.push(LOGIN_URL);
        return;
      }
      // The card catches up when the dialog closes (see closeDialog): refreshing now
      // could remove this card's button, and the dialog with it, if the admin closed registration.
      if (data?.error?.code === "registration_full" || data?.error?.code === "registration_closed") {
        setOutcome("closed");
        return;
      }
      if (data?.error?.code === "already_registered") {
        setOutcome("registered");
        return;
      }
      if (data?.error?.code === "contact_already_registered" && data.error.fields) {
        // Email or phone used by another registration: point at that field only.
        setFieldErrors(data.error.fields);
        return;
      }
      if (!res.ok || data.success !== true) {
        setError(data?.error?.message ?? "Something went wrong. Try again later.");
        if (data?.error?.fields) setFieldErrors(data.error.fields);
        return;
      }
      setDone(true);
      // Refresh the page data so the seat count reflects this registration.
      startRefresh(() => router.refresh());
    } catch {
      setError("Something went wrong. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal labelledBy={`${id}-heading`} busy={saving} dismissOnBackdrop={done || outcome !== null} className="max-w-[480px]" onClose={closeDialog}>
      <DialogHeader
        headingId={`${id}-heading`}
        title={
          done
            ? "You're registered!"
            : outcome === "closed"
              ? "Registrations closed"
              : outcome === "registered"
                ? "You're already registered"
                : "Register for this workshop"
        }
        subtitle={workshopTitle}
        disabled={saving}
        onClose={closeDialog}
      />

      {done ? (
        <div className="grid gap-5 p-6" role="status">
          <div className="flex items-start gap-3 rounded-[13px] bg-[#e8f6e8] p-[15px] text-[14px] text-navy">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green text-white">
              <Icon name="check" size={18} />
            </span>
            <p className="leading-[1.6]">Your seat is booked. We&apos;ll contact you at the email or phone number you shared with the details.</p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-royal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-royal-dark"
          >
            Done
          </button>
        </div>
      ) : outcome === "closed" ? (
        <ClosedBody onClose={closeDialog} />
      ) : outcome === "registered" ? (
        <RegisteredBody onClose={closeDialog} />
      ) : (
        <form onSubmit={submit} method="post" noValidate className="p-6">
          <fieldset disabled={saving} className="min-w-0">
            <Field label="Full name" htmlFor={`${id}-name`} error={fieldErrors.name?.[0]}>
              <input
                className={fieldClass}
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
            </Field>
            <Field label="Phone number" htmlFor={`${id}-phone`} error={fieldErrors.phone?.[0]}>
              <input
                className={fieldClass}
                id={`${id}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+91 98765 43210"
                aria-invalid={Boolean(fieldErrors.phone)}
              />
            </Field>
            <Field label="Email address" htmlFor={`${id}-email`} error={fieldErrors.email?.[0]}>
              <input
                className={fieldClass}
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </Field>
            {/* Honeypot: invisible to humans, catches bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
              <label htmlFor={`${id}-website`}>Website</label>
              <input id={`${id}-website`} name="website" autoComplete="off" tabIndex={-1} value={form.website} onChange={(e) => update("website", e.target.value)} />
            </div>
            {error ? (
              <p role="alert" className="my-3.5 rounded-[13px] bg-[#ffe9e4] p-[15px] text-[13px] font-bold text-[#a3410a]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
            >
              {saving && <Icon name="loader" size={18} className="inline-block animate-spin" />}
              {saving ? "Registering…" : "Confirm registration"}
            </button>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-black text-[#2b3b78]">
        {label} <span aria-hidden="true">*</span>
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] font-bold text-[#a3410a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
