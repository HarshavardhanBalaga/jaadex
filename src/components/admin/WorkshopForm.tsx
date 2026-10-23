"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminRequest, errorMessage } from "@/lib/admin-client/admin-api";
import { workshopSchema } from "@/lib/workshops/validation";
import {
  adminErrorClass,
  adminInputClass,
  adminLabelClass,
  adminNoticeClass,
  adminPrimaryButtonClass,
} from "./admin-ui";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Publish a workshop. The image is sent as a data URL, matching the server schema. */
export function WorkshopForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("image");
    const when = new Date(String(data.get("date") ?? ""));
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (!(file instanceof File) || file.size === 0) {
        setError("Upload an image file (PNG, JPG, WEBP or GIF).");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError("Image too large — keep it under 3 MB.");
        return;
      }
      const payload = {
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        date: Number.isNaN(when.getTime()) ? "" : when.toISOString(),
        location: String(data.get("location") ?? ""),
        image: await readAsDataUrl(file),
      };
      const parsed = workshopSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Check the highlighted fields.");
        return;
      }
      const res = await adminRequest<{ message?: string }>("/api/workshops", {
        method: "POST",
        body: parsed.data,
        session: true,
      });
      if (!res.ok) {
        setError(errorMessage(res.error));
        return;
      }
      form.reset();
      setInfo(res.data.message ?? "Workshop published.");
      router.refresh();
    } catch {
      setError("Could not read the selected image. Try a different file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="workshop-title" className={adminLabelClass}>Title</label>
        <input id="workshop-title" name="title" required minLength={3} maxLength={140} className={adminInputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="workshop-date" className={adminLabelClass}>Date and time</label>
        <input id="workshop-date" name="date" type="datetime-local" required className={adminInputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="workshop-location" className={adminLabelClass}>Location</label>
        <input id="workshop-location" name="location" required minLength={2} maxLength={200} className={adminInputClass} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="workshop-description" className={adminLabelClass}>Description</label>
        <textarea
          id="workshop-description"
          name="description"
          required
          minLength={10}
          maxLength={3000}
          rows={4}
          className={adminInputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="workshop-image" className={adminLabelClass}>Image (PNG, JPG, WEBP or GIF, max 3 MB)</label>
        <input
          id="workshop-image"
          name="image"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
        />
      </div>
      {error && <p role="alert" className={adminErrorClass}>{error}</p>}
      {info && <p role="status" className={adminNoticeClass}>{info}</p>}
      <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
        {busy ? "Publishing…" : "Publish workshop"}
      </button>
    </form>
  );
}
