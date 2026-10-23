"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clearCsrfCache, getCsrfToken } from "@/lib/admin-client/auth-fetch";
import { loginSchema } from "@/lib/admin/validation";
import {
  adminErrorClass,
  adminInputClass,
  adminLabelClass,
  adminLinkClass,
  adminNoticeClass,
  adminPrimaryButtonClass,
} from "./admin-ui";

function postLogin(csrf: string, body: { email: string; password: string }): Promise<Response> {
  return fetch("/api/admin/auth/login", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: JSON.stringify(body),
  });
}

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Setup hint: shown only while no active admin exists. Driven by the public status flag.
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    getCsrfToken().catch(() => undefined);
    fetch("/api/admin/auth/register/status", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d: { registered?: boolean }) => {
        if (d?.registered === false) setNeedsSetup(true);
      })
      .catch(() => undefined);
    // Already signed in: skip the form.
    fetch("/api/admin/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        if (d?.authenticated === true) router.replace("/admin/dashboard");
      })
      .catch(() => undefined);
  }, [router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let res = await postLogin(await getCsrfToken(), parsed.data);
      if (res.status === 403) {
        // Cached CSRF token may be stale (rotated by a logout in another tab): fetch a fresh one and retry once.
        clearCsrfCache();
        res = await postLogin(await getCsrfToken(), parsed.data);
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(data?.error?.message ?? "Invalid email or password.");
        return;
      }
      router.push("/admin/dashboard");
    } catch {
      setError("Service temporarily unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  // No name attributes on purpose: even a native submission cannot put credentials in a URL.
  return (
    <form onSubmit={submit} method="post" className="grid gap-4">
      {needsSetup && (
        <p role="status" className={adminNoticeClass}>
          No administrator account exists yet.{" "}
          <Link href="/admin/register" className={adminLinkClass}>
            Complete the initial setup first.
          </Link>
        </p>
      )}
      <div className="grid gap-1.5">
        <label htmlFor="admin-email" className={adminLabelClass}>Email</label>
        <input
          id="admin-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className={adminInputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="admin-password" className={adminLabelClass}>Password</label>
        <input
          id="admin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={adminInputClass}
        />
      </div>
      {error && <p role="alert" className={adminErrorClass}>{error}</p>}
      <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link href="/admin/forgot-password" className={adminLinkClass}>Forgot password?</Link>
        <Link href="/admin/register" className={adminLinkClass}>Create account</Link>
      </div>
    </form>
  );
}
