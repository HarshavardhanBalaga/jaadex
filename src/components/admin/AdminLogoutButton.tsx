"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/admin-client/auth-fetch";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const csrf = await getCsrfToken().catch(() => "");
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrf },
      }).catch(() => undefined);
    } finally {
      router.push("/admin/login");
    }
  }
  return (
    <button type="button" onClick={logout} disabled={busy}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-midnight px-5 py-2.5 text-[13px] font-black text-white disabled:opacity-60">
      {busy ? "Logging out…" : "Log out →"}
    </button>
  );
}
