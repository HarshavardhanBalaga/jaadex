"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { RazorpayPayButton } from "@/components/kids/RazorpayPayButton";
import { RegistrationNotice } from "@/components/workshops/RegistrationNotice";
import {
  fieldErrorsOf,
  INDIAN_STATES,
  kidsChallengeRegistrationSchema,
  MAX_AGE,
  MAX_CLASS,
  MIN_AGE,
  MIN_CLASS,
} from "@/lib/kids-challenge/registration-validation";

const fieldClass =
  "w-full rounded-xl border border-navy/70 bg-white px-[13px] py-3 text-ink shadow-[0_1px_1px_rgb(7_7_79/0.25)] outline-none focus:border-navy focus:ring-[3px] focus:ring-navy/20 aria-invalid:border-[#a3410a]";

const REGISTER_PATH = "/kids-creative-challenge/register";
const CLASSES = Array.from({ length: MAX_CLASS - MIN_CLASS + 1 }, (_, i) => MIN_CLASS + i);

type Props = {
  /** Signed-in website user, used to prefill the parent details. */
  user: { name: string; email: string };
};

/**
 * Kids Creative Challenge registration: step 1 saves the details (payment pending), step 2 takes the
 * ₹99 Razorpay payment. Validates with the same zod schema as the API; the server is the authority.
 */
export function KidsChallengeRegisterForm({ user }: Props) {
  const router = useRouter();
  const id = useId();
  const blankStudent = { studentName: "", studentClass: "", studentAge: "", schoolName: "" };
  const [form, setForm] = useState({
    parentName: user.name,
    parentEmail: user.email,
    parentPhone: "",
    ...blankStudent,
    city: "",
    state: "",
    consent: false,
    website: "",
  });
  const [busy, setBusy] = useState(false);
  /** Saved registration awaiting payment (step 2), or null while filling the form. */
  const [saved, setSaved] = useState<{ id: string; studentName: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  /** Keep the parent and location details, so a sibling can be registered quickly. */
  function registerAnother() {
    setForm((current) => ({ ...current, ...blankStudent, consent: false }));
    setSaved(null);
    setPaid(false);
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    // Same schema as the server: catch mistakes before a round trip.
    const checked = kidsChallengeRegistrationSchema.safeParse(form);
    if (!checked.success) {
      setFieldErrors(fieldErrorsOf(checked.error));
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/kids-challenge/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        registrationId?: string;
        error?: { code?: string; message?: string; fields?: Record<string, string[]> };
      };
      if (res.status === 401) {
        // Session expired since the page loaded: log in again, then come back here.
        router.push(`/login?next=${encodeURIComponent(REGISTER_PATH)}`);
        return;
      }
      if (data?.error?.code === "payment_pending" && data.registrationId) {
        // Registered before but never paid: go straight to payment for that registration.
        setSaved({ id: data.registrationId, studentName: checked.data.studentName });
        return;
      }
      if (!res.ok || data.success !== true) {
        setError(data?.error?.message ?? "Something went wrong. Try again later.");
        if (data?.error?.fields) setFieldErrors(data.error.fields);
        return;
      }
      if (!data.registrationId) {
        setError("Something went wrong. Try again later.");
        return;
      }
      setSaved({ id: data.registrationId, studentName: checked.data.studentName });
    } catch {
      setError("Something went wrong. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  if (saved && !paid) {
    return (
      <div className="grid justify-items-start gap-4">
        <RegistrationNotice title="Step 2 of 2: complete the payment">
          {saved.studentName}&apos;s details are saved. Pay the ₹99 entry fee securely with Razorpay (UPI, cards, net banking) to confirm the
          registration.
        </RegistrationNotice>
        <RazorpayPayButton registrationId={saved.id} onPaid={() => setPaid(true)} />
      </div>
    );
  }

  if (saved && paid) {
    return (
      <div className="grid justify-items-start gap-4">
        <RegistrationNotice tone="success" title="Registration confirmed!">
          Payment received. {saved.studentName} is registered for the Kids Creative Challenge. We&apos;ll share next steps at the email or phone
          number you gave.
        </RegistrationNotice>
        <button
          type="button"
          onClick={registerAnother}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-royal/30 bg-white px-5 py-[10px] text-[14px] font-black text-royal hover:text-orange"
        >
          Register another child
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} method="post" noValidate className="relative grid gap-5">
      <fieldset disabled={busy} className="grid min-w-0 gap-x-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-[17px] font-bold text-navy">Parent / guardian</legend>
        <Field label="Full name" htmlFor={`${id}-parentName`} error={fieldErrors.parentName?.[0]}>
          <input
            className={fieldClass}
            id={`${id}-parentName`}
            name="parentName"
            autoComplete="name"
            required
            maxLength={80}
            value={form.parentName}
            onChange={(e) => update("parentName", e.target.value)}
            aria-invalid={Boolean(fieldErrors.parentName)}
          />
        </Field>
        <Field label="Phone number" htmlFor={`${id}-parentPhone`} error={fieldErrors.parentPhone?.[0]}>
          <input
            className={fieldClass}
            id={`${id}-parentPhone`}
            name="parentPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            maxLength={10}
            value={form.parentPhone}
            onChange={(e) => update("parentPhone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            aria-invalid={Boolean(fieldErrors.parentPhone)}
          />
        </Field>
        <Field label="Email address" htmlFor={`${id}-parentEmail`} error={fieldErrors.parentEmail?.[0]} className="sm:col-span-2">
          <input
            className={fieldClass}
            id={`${id}-parentEmail`}
            name="parentEmail"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.parentEmail}
            onChange={(e) => update("parentEmail", e.target.value)}
            aria-invalid={Boolean(fieldErrors.parentEmail)}
          />
        </Field>
      </fieldset>

      <fieldset disabled={busy} className="grid min-w-0 gap-x-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-[17px] font-bold text-navy">Student</legend>
        <Field label="Student's full name" htmlFor={`${id}-studentName`} error={fieldErrors.studentName?.[0]} className="sm:col-span-2">
          <input
            className={fieldClass}
            id={`${id}-studentName`}
            name="studentName"
            autoComplete="off"
            required
            maxLength={80}
            value={form.studentName}
            onChange={(e) => update("studentName", e.target.value)}
            aria-invalid={Boolean(fieldErrors.studentName)}
          />
        </Field>
        <Field label="Class" htmlFor={`${id}-studentClass`} error={fieldErrors.studentClass?.[0]}>
          <select
            className={fieldClass}
            id={`${id}-studentClass`}
            name="studentClass"
            required
            value={form.studentClass}
            onChange={(e) => update("studentClass", e.target.value)}
            aria-invalid={Boolean(fieldErrors.studentClass)}
          >
            <option value="">Select class</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age" htmlFor={`${id}-studentAge`} error={fieldErrors.studentAge?.[0]}>
          <input
            className={fieldClass}
            id={`${id}-studentAge`}
            name="studentAge"
            type="number"
            inputMode="numeric"
            min={MIN_AGE}
            max={MAX_AGE}
            required
            value={form.studentAge}
            onChange={(e) => update("studentAge", e.target.value.replace(/\D/g, "").slice(0, 2))}
            aria-invalid={Boolean(fieldErrors.studentAge)}
          />
        </Field>
        <Field label="School name" htmlFor={`${id}-schoolName`} error={fieldErrors.schoolName?.[0]} className="sm:col-span-2">
          <input
            className={fieldClass}
            id={`${id}-schoolName`}
            name="schoolName"
            autoComplete="organization"
            required
            maxLength={120}
            value={form.schoolName}
            onChange={(e) => update("schoolName", e.target.value)}
            aria-invalid={Boolean(fieldErrors.schoolName)}
          />
        </Field>
        <Field label="City" htmlFor={`${id}-city`} error={fieldErrors.city?.[0]}>
          <input
            className={fieldClass}
            id={`${id}-city`}
            name="city"
            autoComplete="address-level2"
            required
            maxLength={60}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            aria-invalid={Boolean(fieldErrors.city)}
          />
        </Field>
        <Field label="State" htmlFor={`${id}-state`} error={fieldErrors.state?.[0]}>
          <select
            className={fieldClass}
            id={`${id}-state`}
            name="state"
            required
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            aria-invalid={Boolean(fieldErrors.state)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <div className="mb-5 grid gap-1.5 sm:col-span-2">
          <label htmlFor={`${id}-consent`} className="flex items-start gap-3 text-[14px] leading-[1.6] text-navy">
            <input
              id={`${id}-consent`}
              name="consent"
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-orange"
              checked={form.consent}
              onChange={(e) => update("consent", e.target.checked)}
              aria-invalid={Boolean(fieldErrors.consent)}
            />
            <span>
              I am the parent or legal guardian of this student and I consent to their participation in the JaaDeX Kids Creative Challenge.{" "}
              <span aria-hidden="true">*</span>
            </span>
          </label>
          {fieldErrors.consent ? (
            <p role="alert" className="text-[12px] font-bold text-[#a3410a]">
              {fieldErrors.consent[0]}
            </p>
          ) : null}
        </div>

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
          {busy ? "Saving…" : "Continue to payment – ₹99"}
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
