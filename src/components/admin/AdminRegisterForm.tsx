"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { registerSchema } from "@/lib/admin/validation";
import { getCsrfToken, clearCsrfCache } from "@/lib/admin-client/auth-fetch";

const inputClass =
  "w-full rounded-xl border border-[#cfd9f0] bg-white px-[13px] py-3 text-ink outline-none focus:border-royal focus:ring-[3px] focus:ring-royal/10";

async function postJson(url: string, body: unknown, retried = false) {
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
  // One retry with a fresh token if the cached one predates a rotation.
  if (!res.ok && !retried) {
    const code = (data?.error as { code?: string } | undefined)?.code;
    if (code === "csrf_invalid") {
      clearCsrfCache();
      return postJson(url, body, true);
    }
  }
  return { ok: res.ok, data };
}

function errMsg(data: Record<string, unknown>, fallback: string): string {
  if (typeof data?.error === "object" && data.error !== null && "message" in data.error) {
    return String((data.error as { message: string }).message);
  }
  return fallback;
}

export function AdminRegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp" | "done">("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    getCsrfToken().catch(() => undefined);
    fetch("/api/admin/auth/register/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { registrationOpen?: boolean }) => {
        if (d && d.registrationOpen === false) setClosed(true);
      })
      .catch(() => undefined);
  }, []);

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const parsed = registerSchema.safeParse({ email, password, confirmPassword: confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the fields.");
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/admin/auth/register", parsed.data);
      if (!ok) {
        setError(errMsg(data, "Registration is unavailable."));
        const code = (data?.error as { code?: string } | undefined)?.code;
        if (code === "registration_unavailable") setClosed(true);
        return;
      }
      setInfo("Code sent to the administrator inbox. Enter it below.");
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { ok, data } = await postJson("/api/admin/auth/register/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (!ok) {
        setError(errMsg(data, "Invalid code."));
        return;
      }
      setStep("done");
      setTimeout(() => {
        router.push("/admin/login");
      }, 1200);
    } finally {
      setBusy(false);
    }
  }
  if (closed && step === "details") {
    return (
      <div role="status" className="rounded-[13px] bg-[#e3ecff] p-[15px] text-[13px] text-royal">
        <strong>Registration is closed.</strong>
        <p className="mt-1 leading-[1.6]">An administrator already exists. Please log in.</p>
      </div>
    );
  }
  if (step === "done") {
    return (
      <div role="status" className="rounded-[13px] bg-[#e3ecff] p-[15px] text-[13px] text-royal">
        <strong>Account activated.</strong>
        <p className="mt-1 leading-[1.6]">Redirecting to login…</p>
      </div>
    );
  }
  if (step === "otp") {
    return (
      // method="post" blocks native GET serialization of the OTP into the URL.
      <form onSubmit={submitOtp} method="post" action="/api/admin/auth/register/verify-otp" className="grid gap-3.5">
        {info ? <p role="status" className="rounded-xl bg-[#e3ecff] px-3 py-2.5 text-[13px] font-bold text-royal">{info}</p> : null}
        <div className="grid gap-1.5">
          <label htmlFor="admin-otp" className="text-xs font-black text-[#2b3b78]">Verification code *</label>
          <input id="admin-otp" inputMode="numeric" autoComplete="one-time-code" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
            placeholder="6-digit code" className={inputClass} />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange disabled:opacity-60">
          {busy ? "Verifying…" : "Verify & activate →"}
        </button>
      </form>
    );
  }
  return (
    // method="post" blocks native GET serialization of email/password into the URL.
    <form onSubmit={submitDetails} method="post" action="/api/admin/auth/register" className="grid gap-3.5">
      <div className="grid gap-1.5">
        <label htmlFor="reg-email" className="text-xs font-black text-[#2b3b78]">Administrator email *</label>
        <input id="reg-email" type="email" required autoComplete="username" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="reg-password" className="text-xs font-black text-[#2b3b78]">Password * (min 8 characters)</label>
        <input id="reg-password" type="password" required autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" className={inputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="reg-confirm" className="text-xs font-black text-[#2b3b78]">Confirm password *</label>
        <input id="reg-confirm" type="password" required autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the password" className={inputClass} />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-[#ffe9e4] px-3 py-2.5 text-[13px] font-bold text-[#a3410a]">{error}</p> : null}
      <button type="submit" disabled={busy}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-orange px-5 py-[13px] text-center font-black text-white shadow-pop-orange disabled:opacity-60">
        {busy ? "Sending code…" : "Send verification code →"}
      </button>
    </form>
  );
}

