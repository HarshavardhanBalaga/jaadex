"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest } from "@/lib/admin-client/admin-api";
import { clearCsrfCache } from "@/lib/admin-client/auth-fetch";
import { adminSecondaryButtonClass } from "./admin-ui";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    // The server clears cookies even for expired sessions, so the outcome does not change what happens next.
    await adminRequest("/api/admin/auth/logout", { method: "POST" });
    // Logout rotates the CSRF cookie; drop the cached token so the next login fetches a fresh one.
    clearCsrfCache();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={adminSecondaryButtonClass}>
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
