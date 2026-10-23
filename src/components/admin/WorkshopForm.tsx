"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB source file ≈ 4 MB base64.

const field =
  "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-navy outline-none transition-colors placeholder:text-muted/60 focus:border-navy/40";
const label = "mb-1 block text-[12px] font-medium text-muted";

/**
 * Plain (non-SurveyJS) create-workshop form: image, title, description,
 * date, location. Submits JSON with the image as a data URL to the
 * admin-protected /api/workshops route, then refreshes the server-rendered list.
 */
export function WorkshopForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPreview(null);
      setMessage({ kind: "error", text: "Image is too large — please choose one under 3 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const image = data.get("image");
    if (!(image instanceof File) || image.size === 0) {
      setMessage({ kind: "error", text: "Please choose an image for the workshop." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(image);
      });
      const payload = {
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        date: String(data.get("date") ?? "").trim(),
        location: String(data.get("location") ?? "").trim(),
        image: dataUrl,
      };
      const csrf = await getCsrfToken();
      const res = await authFetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: { message?: string } } | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Could not create the workshop. Try again.");
      }
      setMessage({ kind: "ok", text: "Workshop published — it now appears on the public Workshops page." });
      form.reset();
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1">
        <label className={label} htmlFor="workshop-image">
          Workshop image
        </label>
        <input
          ref={fileRef}
          id="workshop-image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onPickImage}
          className="w-full cursor-pointer rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:text-navy"
        />
        {preview && <img src={preview} alt="Workshop image preview" className="mt-2 h-40 w-full rounded-xl border border-line object-cover" />}
      </div>
      <div className="grid gap-1">
        <label className={label} htmlFor="workshop-title">
          Title
        </label>
        <input id="workshop-title" name="title" type="text" required maxLength={140} placeholder="e.g. Animation & Storytelling Bootcamp" className={field} />
      </div>
      <div className="grid gap-1">
        <label className={label} htmlFor="workshop-description">
          Description
        </label>
        <textarea
          id="workshop-description"
          name="description"
          required
          minLength={10}
          maxLength={3000}
          rows={4}
          placeholder="What is this workshop about?"
          className={`${field} resize-y`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className={label} htmlFor="workshop-date">
            Date
          </label>
          <input id="workshop-date" name="date" type="date" required className={field} />
        </div>
        <div className="grid gap-1">
          <label className={label} htmlFor="workshop-location">
            Location
          </label>
          <input id="workshop-location" name="location" type="text" required maxLength={200} placeholder="e.g. RTIH, Mangalagiri" className={field} />
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="text-[13px] text-muted"
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-navy bg-navy px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Publishing…" : "Publish workshop"}
      </button>
    </form>
  );
}