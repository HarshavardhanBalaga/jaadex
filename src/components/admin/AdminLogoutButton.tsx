"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, clearCsrfCache } from "@/lib/admin-client/auth-fetch";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const csrf = await getCsrfToken().catch(() => "");
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrf },
      }).catch(() => undefined);
    } finally {
      // Logout rotates the CSRF cookie server-side: drop the cached token so
      // the next login fetches a fresh one instead of 403ing once.
      clearCsrfCache();
      router.push("/admin/login");
    }
  }
  return (
    <button type="button" onClick={logout} disabled={busy}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-4 text-[13px] font-semibold text-navy shadow-card transition-colors hover:border-royal/40 hover:text-royal disabled:opacity-60">
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
