"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema } from "@/lib/admin/validation";
import { getCsrfToken, postJson } from "@/lib/admin-client/auth-fetch";

const inputClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";

function errMsg(data: Record<string, unknown>, fallback: string): string {
  if (typeof data?.error === "object" && data.error !== null && "message" in data.error) {
    return String((data.error as { message: string }).message);
  }
  return fallback;
}

/** Two steps: details -> emailed code. Verifying the code also signs the user in. `next` is pre-sanitized. */
export function UserRegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  // Seconds until "Resend code" is allowed (from the server's resend cooldown).
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    getCsrfToken().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  /** Sends (or re-sends) the verification code; used by the details step and "Resend code". */
  async function sendCode(resend: boolean) {
    if (busy || (resend && resendIn > 0)) return;
    setError("");
    setInfo("");
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword: confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      if (resend) setStep("details");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/auth/register", parsed.data);
      if (!ok) {
        setError(errMsg(data, "Registration is unavailable."));
        return;
      }
      setResendIn(typeof data.resendAvailableInSeconds === "number" ? data.resendAvailableInSeconds : 60);
      setInfo(resend
        ? `A new code is on its way to ${parsed.data.email}. Only the newest code works.`
        : `We sent a verification code to ${parsed.data.email}. Enter it below.`);
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    void sendCode(false);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      // Details are sent again: the server sets the password only at verification.
      const { ok, data } = await postJson("/api/auth/register/verify-otp", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp: otp.trim(),
      });
      if (!ok) {
        setError(errMsg(data, "Invalid code."));
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (step === "otp") {
    return (
      // method="post" blocks native GET serialization of the code into the URL.
      <form onSubmit={submitOtp} method="post" action="/api/auth/register/verify-otp" className="grid gap-3.5">
        {info ? <p role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">{info}</p> : null}
        <div className="grid gap-1.5">
          <label htmlFor="user-otp" className="text-xs font-black text-[#2b3b78]">Verification code *</label>
          <input id="user-otp" inputMode="numeric" autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
            placeholder="6-digit code" className={inputClass} />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange disabled:opacity-60">
          {busy ? "Verifying…" : "Verify & continue →"}
        </button>
        <button type="button" onClick={() => void sendCode(true)} disabled={busy || resendIn > 0}
          className="text-center text-[13px] font-bold text-royal hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline">
          {resendIn > 0 ? `Didn't get a code? Resend in ${resendIn}s` : "Didn't get a code? Resend code"}
        </button>
        <button type="button" onClick={() => { setError(""); setInfo(""); setStep("details"); }}
          className="text-center text-[13px] font-bold text-royal hover:underline">
          ← Change details
        </button>
      </form>
    );
  }
  return (
    // method="post" blocks native GET serialization of email/password into the URL.
    <form onSubmit={submitDetails} method="post" action="/api/auth/register" className="grid gap-3.5">
      <div className="grid gap-1.5">
        <label htmlFor="user-reg-name" className="text-xs font-black text-[#2b3b78]">Full name *</label>
        <input id="user-reg-name" type="text" required autoComplete="name" maxLength={80} value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="user-reg-email" className="text-xs font-black text-[#2b3b78]">Email *</label>
        <input id="user-reg-email" type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="user-reg-password" className="text-xs font-black text-[#2b3b78]">Password * (min 8 characters)</label>
        <input id="user-reg-password" type="password" required autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="user-reg-confirm" className="text-xs font-black text-[#2b3b78]">Confirm password *</label>
        <input id="user-reg-confirm" type="password" required autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" className={inputClass} />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
      <button type="submit" disabled={busy}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange disabled:opacity-60">
        {busy ? "Sending code…" : "Create account →"}
      </button>
      <p className="text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-royal hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
