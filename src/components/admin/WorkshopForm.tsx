"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken, authFetch } from "@/lib/admin-client/auth-fetch";
import { Icon } from "@/components/Icon";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB source file ≈ 4 MB base64.
const DESCRIPTION_MAX = 3000;

const field =
  "w-full rounded-xl border border-[#8d9bc4] bg-white px-4 py-3 text-[15px] leading-snug text-navy outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-royal focus:border-royal focus:ring-4 focus:ring-royal/15";
const label = "text-[13px] font-semibold text-navy";

/**
 * Plain (non-SurveyJS) create-workshop form: image, title, description,
 * date, location. Submits JSON with the image as a data URL to the
 * admin-protected /api/workshops route, then refreshes the server-rendered list.
 */
export function WorkshopForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
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
      setDescriptionLength(0);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-[560px] gap-6" noValidate>
      <div className="grid gap-2">
        <label
          htmlFor="workshop-image"
          className="relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-[#8d9bc4] bg-[#f5f8ff] transition-colors hover:border-royal focus-within:border-royal focus-within:ring-4 focus-within:ring-royal/15"
        >
          <input
            ref={fileRef}
            id="workshop-image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPickImage}
            className="sr-only"
          />
          {preview ? (
            <>
              <img src={preview} alt="Workshop image preview" className="h-52 w-full object-cover" />
              <span className="absolute right-3 bottom-3 rounded-lg bg-navy/85 px-3 py-1.5 text-[12px] font-semibold text-white">
                Change image
              </span>
            </>
          ) : (
            <span className="flex h-44 flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-white text-royal shadow-soft">
                <Icon name="image" size={22} />
              </span>
              <span className="text-[14px] font-semibold text-navy">Choose an image</span>
            </span>
          )}
        </label>
      </div>

      <div className="grid gap-2">
        <label className={label} htmlFor="workshop-title">
          Title
        </label>
        <input id="workshop-title" name="title" type="text" required maxLength={140} placeholder="e.g. Animation & Storytelling Bootcamp" className={field} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label className={label} htmlFor="workshop-description">
            Description
          </label>
          <span className="text-[12px] text-muted tabular-nums">
            {descriptionLength} / {DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="workshop-description"
          name="description"
          required
          minLength={10}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          placeholder="What is this workshop about? Who should attend?"
          onChange={(e) => setDescriptionLength(e.currentTarget.value.length)}
          className={`${field} resize-y`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={label} htmlFor="workshop-date">
            Date
          </label>
          <input id="workshop-date" name="date" type="date" required className={field} />
        </div>
        <div className="grid gap-2">
          <label className={label} htmlFor="workshop-location">
            Location
          </label>
          <input id="workshop-location" name="location" type="text" required maxLength={200} placeholder="e.g. RTIH, Mangalagiri" className={field} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={`text-[13px] font-medium ${message?.kind === "error" ? "text-[#c1440e]" : "text-green"}`}>
          {message?.text}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-royal px-6 text-[14px] font-semibold text-white shadow-pop-royal transition-[background-color,transform] hover:bg-royal-dark active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Publishing…" : "Publish workshop"}
        </button>
      </div>
    </form>
  );
}
