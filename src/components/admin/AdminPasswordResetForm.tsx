"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { adminRequest, errorMessage } from "@/lib/admin-client/admin-api";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/admin/validation";
import {
  adminErrorClass,
  adminInputClass,
  adminLabelClass,
  adminLinkClass,
  adminNoticeClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "./admin-ui";

type Step = "request" | "reset" | "done";

const GENERIC_SENT = "If that email is registered, a reset code has been sent.";

export function AdminPasswordResetForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    const res = await adminRequest<{ message?: string }>("/api/admin/auth/password/forgot", {
      method: "POST",
      body: parsed.data,
    });
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    // Server answers the same for every email, so the form never reveals which accounts exist.
    setEmail(parsed.data.email);
    setInfo(res.data.message ?? GENERIC_SENT);
    setStep("reset");
  }

  async function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = resetPasswordSchema.safeParse({ email, otp, newPassword, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await adminRequest("/api/admin/auth/password/reset", {
      method: "POST",
      body: parsed.data,
    });
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="grid gap-4">
        <p role="status" className={adminNoticeClass}>Password updated. Please log in with your new password.</p>
        <Link href="/admin/login" className={adminPrimaryButtonClass}>Back to sign in</Link>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={resetPassword} method="post" className="grid gap-4">
        {info && <p role="status" className={adminNoticeClass}>{info}</p>}
        <div className="grid gap-1.5">
          <label htmlFor="reset-otp" className={adminLabelClass}>Reset code</label>
          <input
            id="reset-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="6-digit code"
            className={adminInputClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="reset-new-password" className={adminLabelClass}>New password (min 8 characters)</label>
          <input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={adminInputClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="reset-confirm-password" className={adminLabelClass}>Confirm new password</label>
          <input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={adminInputClass}
          />
        </div>
        {error && <p role="alert" className={adminErrorClass}>{error}</p>}
        <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
          {busy ? "Updating…" : "Update password"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError("");
            setInfo("");
            setStep("request");
          }}
          className={adminSecondaryButtonClass}
        >
          Request a new code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} method="post" className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="forgot-email" className={adminLabelClass}>Admin email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className={adminInputClass}
        />
      </div>
      {error && <p role="alert" className={adminErrorClass}>{error}</p>}
      <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
        {busy ? "Sending…" : "Send reset code"}
      </button>
      <p className="text-center text-sm">
        <Link href="/admin/login" className={adminLinkClass}>← Back to sign in</Link>
      </p>
    </form>
  );
}
