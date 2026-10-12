"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCsrfToken, clearCsrfCache } from "@/lib/admin-client/auth-fetch";

async function postJson(url: string, body: unknown, retried = false): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const csrf = await getCsrfToken();
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  // One retry with a fresh token: the cached token may predate a rotation
  // (e.g. logout rotated the cookie in another tab). Never loops.
  if (!res.ok && !retried) {
    const code = typeof data?.error === "object" && data.error !== null && "code" in data.error
      ? (data.error as { code?: string }).code
      : undefined;
    if (code === "csrf_invalid") {
      clearCsrfCache();
      return postJson(url, body, true);
    }
  }
  return { ok: res.ok, data };
}

const inputClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";

export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "forgot" | "reset" | "done">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  // First-run setup hint: true when no active admin exists yet. Driven only
  // by the already-public register/status flag — reveals nothing per-email.
  const [showSetup, setShowSetup] = useState(false);
  useEffect(() => {
    getCsrfToken().catch(() => undefined);
    fetch("/api/admin/auth/register/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { registered?: boolean }) => {
        if (d && d.registered === false) setShowSetup(true);
      })
      .catch(() => undefined);
  }, []);
  function backToLogin(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setStep("login");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
      if (!password) {
        setError("Enter your password.");
        return;
      }
      const { ok, data } = await postJson("/api/admin/auth/login", { email: email.trim(), password });
      if (!ok) {
        setError(typeof data?.error === "object" && data.error !== null && "message" in data.error
          ? String((data.error as { message: string }).message)
          : "Invalid email or password.");
        return;
      }
      router.push("/admin/dashboard");
    } finally {
      setBusy(false);
    }
  }
  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
      const { ok, data } = await postJson("/api/admin/auth/password/forgot", { email: email.trim() });
      if (!ok) {
        setError(typeof data?.error === "object" && data.error !== null && "message" in data.error
          ? String((data.error as { message: string }).message)
          : "Service temporarily unavailable.");
        return;
      }
      setInfo("If that email is registered, a reset code has been sent. Enter it below with your new password.");
      setStep("reset");
    } finally {
      setBusy(false);
    }
  }
  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!/^[0-9]{6,8}$/.test(otp.trim())) {
        setError("Enter the 6-8 digit code.");
        return;
      }
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      const { ok, data } = await postJson("/api/admin/auth/password/reset", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword: confirm,
      });
      if (!ok) {
        setError(typeof data?.error === "object" && data.error !== null && "message" in data.error
          ? String((data.error as { message: string }).message)
          : "Invalid code or email.");
        return;
      }
      setStep("done");
    } finally {
      setBusy(false);
    }
  }
  if (step === "done") {
    return (
      <div role="status" className="grid gap-3.5">
        <p className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">Password updated. Please log in with your new password.</p>
        <button type="button" onClick={(e) => backToLogin(e)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none">
          Back to sign in →
        </button>
      </div>
    );
  }
  if (step === "forgot") {
    return (
      <form onSubmit={submitForgot} method="post" action="/api/admin/auth/password/forgot" className="grid gap-3.5">
        <div className="grid gap-1.5">
          <label htmlFor="admin-email" className="text-xs font-black text-[#2b3b78]">Email *</label>
          <input id="admin-email" type="email" required autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className={inputClass} />
        </div>
        {info ? <p role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">{info}</p> : null}
        {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none">
          {busy ? "Sending…" : "Send reset code →"}
        </button>
        <button type="button" onClick={(e) => backToLogin(e)} className="text-center text-[13px] font-bold text-royal hover:underline">
          ← Back to sign in
        </button>
      </form>
    );
  }
  if (step === "reset") {
    return (
      <form onSubmit={submitReset} method="post" action="/api/admin/auth/password/reset" className="grid gap-3.5">
        {info ? <p role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">{info}</p> : null}
        <div className="grid gap-1.5">
          <label htmlFor="admin-reset-otp" className="text-xs font-black text-[#2b3b78]">Reset code *</label>
          <input id="admin-reset-otp" inputMode="numeric" autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
            placeholder="6-digit code" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="admin-new-password" className="text-xs font-black text-[#2b3b78]">New password * (min 8 characters)</label>
          <input id="admin-new-password" type="password" required autoComplete="new-password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} placeholder="Choose a new password" className={inputClass} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="admin-confirm-password" className="text-xs font-black text-[#2b3b78]">Confirm new password *</label>
          <input id="admin-confirm-password" type="password" required autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" className={inputClass} />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none">
          {busy ? "Updating…" : "Update password →"}
        </button>
        <button type="button" onClick={(e) => backToLogin(e)} className="text-center text-[13px] font-bold text-royal hover:underline">
          ← Back to sign in
        </button>
      </form>
    );
  }
  return (
    // method="post" is defense-in-depth: even a native (non-React) submission
    // must never serialize credentials into the URL query string.
    <form onSubmit={submit} method="post" action="/api/admin/auth/login" className="grid gap-3.5">
      {showSetup ? (
        <div role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">
          No administrator account exists yet —{" "}
          <Link href="/admin/register" className="underline">complete the initial setup first →</Link>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <label htmlFor="admin-email" className="text-xs font-black text-[#2b3b78]">Email *</label>
        <input id="admin-email" type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-password" className="text-xs font-black text-[#2b3b78]">Password *</label>
        <input id="admin-password" type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className={inputClass} />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
      <button type="submit" disabled={busy}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-royal px-5 py-[13px] text-center font-black text-white shadow-pop-royal transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none">
        {busy ? "Signing in…" : "Sign in →"}
      </button>
      <div className="flex items-center justify-between gap-3 text-[13px] font-bold text-royal">
        <button type="button" onClick={() => { setError(""); setInfo(""); setStep("forgot"); }} className="hover:underline">
          Forgot password?
        </button>
        <Link href="/admin/register" className="hover:underline">Create account</Link>
      </div>
    </form>
  );
}
