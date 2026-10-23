"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { adminRequest, errorMessage } from "@/lib/admin-client/admin-api";
import { registerSchema, verifyOtpSchema } from "@/lib/admin/validation";
import {
  adminErrorClass,
  adminInputClass,
  adminLabelClass,
  adminLinkClass,
  adminNoticeClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "./admin-ui";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type Step = "details" | "verify";

export function AdminRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  // Validated details kept for the verify step, so "resend" can re-send them.
  const [pending, setPending] = useState<RegisterPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // null while the public status flag loads; false when registration is closed.
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    adminRequest<{ registrationOpen?: boolean }>("/api/admin/auth/register/status").then((res) => {
      setOpen(res.ok ? res.data.registrationOpen !== false : true);
    });
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(payload: RegisterPayload) {
    return adminRequest<{ message?: string; resendAvailableInSeconds?: number }>("/api/admin/auth/register", {
      method: "POST",
      body: payload,
    });
  }

  async function submitDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    const res = await sendCode(parsed.data);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setPending(parsed.data);
    setEmail(parsed.data.email);
    setInfo(res.data.message ?? "Verification code sent. Check the administrator inbox.");
    setResendIn(res.data.resendAvailableInSeconds ?? 0);
    setStep("verify");
  }

  async function resend() {
    if (busy || resendIn > 0 || !pending) return;
    setBusy(true);
    setError("");
    setInfo("");
    // Registering again with a pending email re-sends the code (server enforces the cooldown).
    const res = await sendCode(pending);
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setInfo(res.data.message ?? "A new code was sent.");
    setResendIn(res.data.resendAvailableInSeconds ?? 0);
  }

  async function submitOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = verifyOtpSchema.safeParse({ email, otp: otp.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the 6-8 digit code.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await adminRequest("/api/admin/auth/register/verify-otp", {
      method: "POST",
      body: { email, otp: otp.trim() },
    });
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    router.push("/admin/login");
  }

  if (open === false) {
    return <p role="status" className={adminNoticeClass}>Admin registration is currently closed.</p>;
  }

  if (step === "verify") {
    return (
      <form onSubmit={submitOtp} method="post" className="grid gap-4">
        <p className="text-sm text-slate-600">
          Enter the code sent to the administrator inbox for <span className="font-semibold text-slate-900">{email}</span>.
        </p>
        {info && <p role="status" className={adminNoticeClass}>{info}</p>}
        <div className="grid gap-1.5">
          <label htmlFor="admin-register-otp" className={adminLabelClass}>Verification code</label>
          <input
            id="admin-register-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="6-digit code"
            className={adminInputClass}
          />
        </div>
        {error && <p role="alert" className={adminErrorClass}>{error}</p>}
        <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
          {busy ? "Verifying…" : "Verify and activate"}
        </button>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={resend} disabled={busy || resendIn > 0} className={adminSecondaryButtonClass}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setInfo("");
              setStep("details");
            }}
            className={adminLinkClass}
          >
            ← Edit details
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitDetails} method="post" className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="admin-name" className={adminLabelClass}>Full name</label>
        <input id="admin-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={adminInputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-register-email" className={adminLabelClass}>Email</label>
        <input
          id="admin-register-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className={adminInputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-register-password" className={adminLabelClass}>Password (min 8 characters)</label>
        <input
          id="admin-register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={adminInputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-register-confirm" className={adminLabelClass}>Confirm password</label>
        <input
          id="admin-register-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={adminInputClass}
        />
      </div>
      {error && <p role="alert" className={adminErrorClass}>{error}</p>}
      <button type="submit" disabled={busy || open === null} className={adminPrimaryButtonClass}>
        {busy ? "Sending code…" : "Send verification code"}
      </button>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/admin/login" className={adminLinkClass}>Sign in</Link>
      </p>
    </form>
  );
}
