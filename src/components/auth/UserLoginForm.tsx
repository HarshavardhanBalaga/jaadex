"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordSchema } from "@/lib/admin/validation";
import { getCsrfToken, postJson } from "@/lib/admin-client/auth-fetch";

const inputClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";
const primaryButtonClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";
const linkButtonClass = "text-center text-[13px] font-bold text-royal hover:underline";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorCode(data: Record<string, unknown>): string | undefined {
  return typeof data?.error === "object" && data.error !== null && "code" in data.error
    ? (data.error as { code?: string }).code
    : undefined;
}

function errMsg(data: Record<string, unknown>, fallback: string): string {
  return typeof data?.error === "object" && data.error !== null && "message" in data.error
    ? String((data.error as { message: string }).message)
    : fallback;
}

/**
 * Login with an in-place forgot-password flow:
 * login -> forgot (email) -> reset (code + new password) -> back to login.
 * `next` is already sanitized by the page (safeNext).
 */
export function UserLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  // Seconds until "Resend code" is allowed (mirrors the server's resend cooldown).
  const [resendIn, setResendIn] = useState(0);
  useEffect(() => {
    getCsrfToken().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function goTo(nextStep: "login" | "forgot" | "reset") {
    setError("");
    setInfo("");
    setStep(nextStep);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/auth/login", { email: email.trim(), password });
      if (!ok) {
        if (errorCode(data) === "no_account") {
          // Only a fixed flag goes in the URL — never the email.
          router.push(`/register?next=${encodeURIComponent(next)}&reason=no_account`);
          return;
        }
        setError(errMsg(data, "Invalid email or password."));
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Requests a reset code; used by the forgot step and by "Resend code". */
  async function sendResetCode(resend: boolean) {
    if (busy || (resend && resendIn > 0)) return;
    setError("");
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/auth/password/forgot", { email: email.trim() });
      if (!ok) {
        setError(errMsg(data, "Service temporarily unavailable."));
        return;
      }
      setResendIn(typeof data.resendAvailableInSeconds === "number" ? data.resendAvailableInSeconds : 60);
      setOtp("");
      setStep("reset");
      setInfo(resend
        ? `A new code is on its way to ${email.trim()}. Only the newest code works.`
        : `If ${email.trim()} has an account, we've emailed it a reset code. Enter it below with your new password.`);
    } finally {
      setBusy(false);
    }
  }

  function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setNewPassword("");
    setConfirm("");
    void sendResetCode(false);
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const parsed = resetPasswordSchema.safeParse({
      email: email.trim(),
      otp: otp.trim(),
      newPassword,
      confirmPassword: confirm,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/auth/password/reset", parsed.data);
      if (!ok) {
        setError(errMsg(data, "Invalid code or email."));
        return;
      }
      setPassword("");
      setStep("login");
      setInfo("Password updated. Log in with your new password.");
    } finally {
      setBusy(false);
    }
  }

  const infoBox = info ? <p role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">{info}</p> : null;
  const errorBox = error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null;
  const emailField = (
    <div className="grid gap-1.5">
      <label htmlFor="user-email" className="text-xs font-black text-[#2b3b78]">Email *</label>
      <input id="user-email" type="email" required autoComplete="username" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
    </div>
  );

  if (step === "forgot") {
    return (
      <form onSubmit={submitForgot} method="post" action="/api/auth/password/forgot" className="grid gap-3.5">
        <p className="text-[13px] text-muted">Enter your account email and we&apos;ll send you a code to reset your password.</p>
        {emailField}
        {errorBox}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Sending…" : "Send reset code →"}
        </button>
        <button type="button" onClick={() => goTo("login")} className={linkButtonClass}>← Back to log in</button>
      </form>
    );
  }

  if (step === "reset") {
    return (
      // method="post" blocks native GET serialization of the code/password into the URL.
      <form onSubmit={submitReset} method="post" action="/api/auth/password/reset" className="grid gap-3.5">
        {infoBox}
        <div className="grid gap-1.5">
          <label htmlFor="user-reset-otp" className="text-xs font-black text-[#2b3b78]">Reset code *</label>
          <input id="user-reset-otp" inputMode="numeric" autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
            placeholder="6-digit code" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="user-new-password" className="text-xs font-black text-[#2b3b78]">New password * (min 8 characters)</label>
          <input id="user-new-password" type="password" required autoComplete="new-password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} placeholder="Choose a new password" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="user-confirm-password" className="text-xs font-black text-[#2b3b78]">Confirm new password *</label>
          <input id="user-confirm-password" type="password" required autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" className={inputClass} />
        </div>
        {errorBox}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Updating…" : "Update password →"}
        </button>
        <button type="button" onClick={() => void sendResetCode(true)} disabled={busy || resendIn > 0}
          className={`${linkButtonClass} disabled:cursor-not-allowed disabled:text-muted disabled:no-underline`}>
          {resendIn > 0 ? `Didn't get a code? Resend in ${resendIn}s` : "Didn't get a code? Resend code"}
        </button>
        <button type="button" onClick={() => goTo("forgot")} className={linkButtonClass}>Use a different email</button>
        <button type="button" onClick={() => goTo("login")} className={linkButtonClass}>← Back to log in</button>
      </form>
    );
  }

  return (
    // method="post" is defense-in-depth: a native submission never puts credentials in the URL.
    <form onSubmit={submit} method="post" action="/api/auth/login" className="grid gap-3.5">
      {infoBox}
      {emailField}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="user-password" className="text-xs font-black text-[#2b3b78]">Password *</label>
          <button type="button" onClick={() => goTo("forgot")} className="text-xs font-bold text-royal hover:underline">
            Forgot password?
          </button>
        </div>
        <input id="user-password" type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
      </div>
      {errorBox}
      <button type="submit" disabled={busy} className={primaryButtonClass}>
        {busy ? "Signing in…" : "Log in →"}
      </button>
      <p className="text-center text-[13px] text-muted">
        New to JaaDeX?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-bold text-royal hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
