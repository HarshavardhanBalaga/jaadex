"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest, errorMessage } from "@/lib/admin-client/admin-api";
import { adminErrorClass, adminSecondaryButtonClass } from "./admin-ui";

export function WorkshopDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    const res = await adminRequest(`/api/workshops/${encodeURIComponent(id)}`, { method: "DELETE", session: true });
    setBusy(false);
    if (!res.ok) {
      setError(errorMessage(res.error));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={remove} disabled={busy} className={adminSecondaryButtonClass}>
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <p role="alert" className={adminErrorClass}>{error}</p>}
    </div>
  );
}
