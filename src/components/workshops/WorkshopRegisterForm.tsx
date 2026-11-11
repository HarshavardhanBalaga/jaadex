"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { RegistrationNotice } from "@/components/workshops/RegistrationNotice";
import { fieldErrorsOf, registrationSchema } from "@/lib/workshops/registration-validation";

const fieldClass =
  "w-full rounded-xl border border-navy/70 bg-white px-[13px] py-3 text-ink shadow-[0_1px_1px_rgb(7_7_79/0.25)] outline-none focus:border-navy focus:ring-[3px] focus:ring-navy/20 aria-invalid:border-[#a3410a]";

type Props = {
  workshopId: string;
  /** Signed-in website user, used to prefill the form. */
  user: { name: string; email: string };
};

/**
 * Registration form on the workshop's register page. Validates with the same zod schema as the API,
 * then the server validates again as the authority.
 */
export function WorkshopRegisterForm({ workshopId, user }: Props) {
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

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
        router.push(`/login?next=${encodeURIComponent(`/workshops/${workshopId}/register`)}`);
        return;
      }
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
    } catch {
      setError("Something went wrong. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <RegistrationNotice tone="success" title="You're registered!">
        Your seat is booked. We&apos;ll contact you at the email or phone number you shared.
      </RegistrationNotice>
    );
  }
  if (outcome === "closed") {
    return (
      <RegistrationNotice title="Registrations closed">
        All seats for this workshop have been filled. Thank you for your interest! Use “Ask about this workshop” and we’ll let you know about the
        next session.
      </RegistrationNotice>
    );
  }
  if (outcome === "registered") {
    return (
      <RegistrationNotice title="You're already registered">
        You already have a seat for this workshop. We&apos;ll contact you at the email or phone number you registered with.
      </RegistrationNotice>
    );
  }

  return (
    <form onSubmit={submit} method="post" noValidate className="relative grid gap-5">
      <fieldset disabled={busy} className="grid min-w-0 gap-x-5 sm:grid-cols-2">
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
            inputMode="numeric"
            autoComplete="tel-national"
            required
            maxLength={10}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Phone number"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </Field>
        <Field label="Email address" htmlFor={`${id}-email`} error={fieldErrors.email?.[0]} className="sm:col-span-2">
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
          <p role="alert" className="rounded-[13px] bg-[#ffe9e4] p-[15px] text-[13px] font-bold text-[#a3410a] sm:col-span-2">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-2 inline-flex w-auto cursor-pointer items-center justify-center gap-2 justify-self-start rounded-full bg-orange px-6 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:col-span-2"
        >
          {busy && <Icon name="loader" size={18} className="inline-block animate-spin" />}
          {busy ? "Registering…" : "Confirm registration"}
        </button>
      </fieldset>
    </form>
  );
}

function Field({ label, htmlFor, error, className = "", children }: { label: string; htmlFor: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`mb-5 grid content-start gap-1.5 ${className}`}>
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
