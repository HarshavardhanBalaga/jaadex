"use client";

import { useState } from "react";
import { interests } from "@/lib/contact/validation";

export function ContactForm({ initialInterest = "" }: { initialInterest?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    interest: (interests as readonly string[]).includes(initialInterest) ? initialInterest : "JaaDeX Animate for Schools",
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string; fields?: Record<string, string[]> };
      };
      if (!res.ok || data.success !== true) {
        setError(data?.error?.message ?? "Something went wrong. Try again later.");
        if (data?.error?.fields) setFieldErrors(data.error.fields);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[13px] bg-[#e3ecff] p-[15px] text-[13px] text-royal" role="status">
        <strong>Thanks — enquiry received.</strong>
        <p className="mt-[7px] leading-[1.6]">We&apos;ll be in touch shortly at the email you shared.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} method="post" action="/api/contact">
      <FormRow label="Your name *" htmlFor="name" error={fieldErrors.name?.[0]}>
        <input className={fieldClass} id="name" name="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Enter your name" />
      </FormRow>
      <FormRow label="Email address *" htmlFor="email" error={fieldErrors.email?.[0]}>
        <input className={fieldClass} id="email" name="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
      </FormRow>
      <FormRow label="School / organization" htmlFor="organization">
        <input className={fieldClass} id="organization" name="organization" value={form.organization} onChange={(e) => update("organization", e.target.value)} placeholder="Organization name (optional)" />
      </FormRow>
      <FormRow label="I'm interested in *" htmlFor="interest" error={fieldErrors.interest?.[0]}>
        <select className={fieldClass} id="interest" name="interest" value={form.interest} onChange={(e) => update("interest", e.target.value)}>{interests.map((interest) => <option key={interest}>{interest}</option>)}</select>
      </FormRow>
      <FormRow label="Your message *" htmlFor="message" error={fieldErrors.message?.[0]}>
        <textarea className={fieldClass} id="message" name="message" required rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us about your needs or idea…" />
      </FormRow>
      {/* Honeypot: invisible to humans, catches bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" autoComplete="off" tabIndex={-1} value={form.website} onChange={(e) => update("website", e.target.value)} />
      </div>
      {error ? <p role="alert" className="my-3.5 rounded-[13px] bg-[#ffe9e4] p-[15px] text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
      <button className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Prepare enquiry ↗"}
      </button>
    </form>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";

function FormRow({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="my-3.5 grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-black text-[#2b3b78]">{label}</label>
      {children}
      {error ? <p role="alert" className="text-[12px] font-bold text-[#a3410a]">{error}</p> : null}
    </div>
  );
}
