"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordSchema } from "@/lib/admin/validation";
import { userSetupPasswordSchema } from "@/lib/user/validation";
import { getCsrfToken, postJson } from "@/lib/admin-client/auth-fetch";
import { GoogleMark, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const GOOGLE_ERROR = "Google sign-in didn't complete. Try again or use your email and password.";

type Step = "login" | "forgot" | "reset" | "setup" | "setup-confirm";

const inputClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";
const primaryButtonClass =
  "inline-flex w-auto cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-8 py-[13px] text-center font-black text-white shadow-pop-orange transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";
const fullWidthPrimaryButtonClass = primaryButtonClass.replace("w-auto", "w-full");
const secondaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd9f0] bg-white px-3 py-2.5 text-[13px] font-bold text-navy transition-colors duration-200 hover:border-royal/40 hover:bg-[#f3f6fd] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-royal/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";
const linkButtonClass = "cursor-pointer text-center text-[13px] font-bold text-royal hover:underline";
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
 * Login with in-place flows:
 *  - forgot password (existing password): forgot (email) -> reset (code + new password);
 *  - set a password (Google account adding one): setup (email) -> setup-confirm (code + new password).
 * `next` is already sanitized by the page (safeNext).
 */
export function UserLoginForm({ next, googleError = false }: { next: string; googleError?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(googleError ? GOOGLE_ERROR : "");
  const [info, setInfo] = useState("");
  // After a failed password login: the API never says why, so always offer the Google-account paths.
  const [loginFailed, setLoginFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  function goTo(nextStep: Step) {
    setError("");
    setInfo("");
    setLoginFailed(false);
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
        setLoginFailed(true);
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

  /** Requests a password-setup code; used by the setup step and by "Resend code". */
  async function sendSetupCode(resend: boolean) {
    if (busy || (resend && resendIn > 0)) return;
    setError("");
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/auth/password/setup/request", { email: email.trim() });
      if (!ok) {
        setError(errMsg(data, "Service temporarily unavailable."));
        return;
      }
      setResendIn(typeof data.resendAvailableInSeconds === "number" ? data.resendAvailableInSeconds : 60);
      setOtp("");
      setStep("setup-confirm");
      setInfo(resend
        ? `A new code is on its way to ${email.trim()}. Only the newest code works.`
        : `If ${email.trim()} uses Google sign-in without a password, we've emailed it a setup code. Enter it below and choose your password.`);
    } finally {
      setBusy(false);
    }
  }

  function submitSetup(e: React.FormEvent) {
    e.preventDefault();
    setNewPassword("");
    setConfirm("");
    void sendSetupCode(false);
  }

  async function submitSetupConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const parsed = userSetupPasswordSchema.safeParse({
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
      const { ok, data } = await postJson("/api/auth/password/setup/confirm", parsed.data);
      if (!ok) {
        setError(errMsg(data, "Invalid code or email."));
        return;
      }
      setPassword("");
      setStep("login");
      setInfo("Password set. You can now log in with your email and password, or keep using Google.");
    } finally {
      setBusy(false);
    }
  }

  const infoBox = info ? (
    <div role="status" className="flex items-start gap-2.5 rounded-xl border border-[#cddcff] bg-[#eef3ff] px-3.5 py-3 text-[13px] font-semibold text-royal">
      <i className="ri-information-line mt-px text-[16px] leading-none" aria-hidden="true" />
      <span>{info}</span>
    </div>
  ) : null;
  const errorBox = error ? (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#ffd2c4] bg-[#fff4f0] px-3.5 py-3 text-[13px] font-semibold text-[#a3410a]">
      <i className="ri-error-warning-line mt-px text-[16px] leading-none" aria-hidden="true" />
      <span>{error}</span>
    </div>
  ) : null;
  const emailField = (
    <div className="grid gap-2">
      <label htmlFor="user-email" className="text-xs font-black text-[#2b3b78]">Email address *</label>
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

  if (step === "setup") {
    return (
      <form onSubmit={submitSetup} method="post" action="/api/auth/password/setup/request" className="grid gap-3.5">
        <p className="text-[13px] text-muted">
          Signed up with Google? Add a password so you can also log in with your email. Enter your account email and
          we&apos;ll send you a code. Your account stays the same.
        </p>
        {emailField}
        {errorBox}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Sending…" : "Send setup code →"}
        </button>
        <button type="button" onClick={() => goTo("login")} className={linkButtonClass}>← Back to log in</button>
      </form>
    );
  }

  if (step === "setup-confirm") {
    return (
      // method="post" blocks native GET serialization of the code/password into the URL.
      <form onSubmit={submitSetupConfirm} method="post" action="/api/auth/password/setup/confirm" className="grid gap-3.5">
        {infoBox}
        <div className="grid gap-1.5">
          <label htmlFor="user-setup-otp" className="text-xs font-black text-[#2b3b78]">Setup code *</label>
          <input id="user-setup-otp" inputMode="numeric" autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
            placeholder="6-digit code" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="user-setup-password" className="text-xs font-black text-[#2b3b78]">Password * (min 8 characters)</label>
          <input id="user-setup-password" type="password" required autoComplete="new-password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} placeholder="Choose a password" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="user-setup-confirm" className="text-xs font-black text-[#2b3b78]">Confirm password *</label>
          <input id="user-setup-confirm" type="password" required autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" className={inputClass} />
        </div>
        {errorBox}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Saving…" : "Set password →"}
        </button>
        <button type="button" onClick={() => void sendSetupCode(true)} disabled={busy || resendIn > 0}
          className={`${linkButtonClass} disabled:cursor-not-allowed disabled:text-muted disabled:no-underline`}>
          {resendIn > 0 ? `Didn't get a code? Resend in ${resendIn}s` : "Didn't get a code? Resend code"}
        </button>
        <button type="button" onClick={() => goTo("setup")} className={linkButtonClass}>Use a different email</button>
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
    <form onSubmit={submit} method="post" action="/api/auth/login" className="grid gap-5">
      {infoBox}
      <GoogleSignInButton next={next} label="Continue with Google" />
      {emailField}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="user-password" className="text-xs font-black text-[#2b3b78]">Password *</label>
          <button type="button" onClick={() => goTo("forgot")} className="cursor-pointer text-xs font-bold text-royal hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input id="user-password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            className={`${inputClass} pr-11`} />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-muted transition-colors hover:text-royal focus-visible:text-royal focus-visible:outline-none">
            <i className={`${showPassword ? "ri-eye-off-line" : "ri-eye-line"} text-[18px]`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {errorBox}
      {loginFailed ? (
        // Shown after ANY failed login (the API never says why), so it reveals nothing about the account.
        <section aria-labelledby="google-assist-title" className="grid gap-3 rounded-xl border border-[#d6e2fb] bg-[#f5f8ff] p-3.5">
          <div className="flex items-start gap-2.5">
            <i className="ri-information-line mt-px text-[17px] leading-none text-royal" aria-hidden="true" />
            <div className="grid gap-0.5">
              <h2 id="google-assist-title" className="text-[13px] font-bold text-navy">Signed up with Google?</h2>
              <p className="text-[12.5px] leading-relaxed text-muted">
                You can sign in with Google or set a password to access your account using your email.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} className={secondaryButtonClass}>
              <GoogleMark />
              Continue with Google
            </a>
            <button type="button" onClick={() => goTo("setup")} disabled={busy} className={secondaryButtonClass}>
              <i className="ri-lock-password-line text-[16px] text-royal" aria-hidden="true" />
              Set a password
            </button>
          </div>
        </section>
      ) : null}
      <button type="submit" disabled={busy} className={fullWidthPrimaryButtonClass}>
        {busy ? (
          <>
            <i className="ri-loader-4-line animate-spin text-[18px] motion-reduce:animate-none" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Log in →"
        )}
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
